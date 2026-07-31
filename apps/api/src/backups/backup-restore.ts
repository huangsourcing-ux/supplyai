import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { tmpdir } from "node:os";

import { parseBackupRestoreCliEnv } from "@chinasupply/config/env/api";
import { Pool } from "pg";

import { PrivateObjectStorageService } from "../imports/private-object-storage.service.js";
import {
  BACKUP_POSTGRES_MAJOR,
  BACKUP_TIMEOUT_MS,
} from "./backup.constants.js";
import {
  assertBackupManifestObjectKey,
  buildBackupPrefix,
} from "./backup-object-keys.js";
import { backupManifestSchema, type BackupManifest } from "./backup.schemas.js";
import {
  buildPostgresProcessEnvironment,
  inspectBackupToolVersions,
  runStreamingPipeline,
} from "./backup-tools.js";

interface RestoreArguments {
  identityFile: string;
  manifestKey: string;
}

interface UserTable {
  rowCount: string;
  schemaName: string;
  tableName: string;
}

function parseRestoreArguments(
  arguments_: readonly string[],
): RestoreArguments {
  let identityFile: string | undefined;
  let manifestKey: string | undefined;
  let confirmed = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--confirm-isolated-target") {
      confirmed = true;
      continue;
    }
    if (argument === "--identity-file") {
      identityFile = arguments_[++index];
      continue;
    }
    if (argument === "--manifest-key") {
      manifestKey = arguments_[++index];
      continue;
    }
    throw new Error("Unsupported backup restore argument");
  }

  if (!confirmed || identityFile === undefined || manifestKey === undefined) {
    throw new Error(
      "Restore requires --manifest-key, --identity-file, and --confirm-isolated-target",
    );
  }
  return { identityFile, manifestKey };
}

function databaseIdentity(value: string): string {
  const url = new URL(value);
  const port = url.port.length > 0 ? url.port : "5432";
  return `${url.protocol.toLowerCase()}//${url.hostname.toLowerCase()}:${port}${decodeURIComponent(url.pathname)}`;
}

export function assertDistinctDatabaseTargets(
  sourceUrl: string,
  targetUrl: string,
): void {
  if (databaseIdentity(sourceUrl) === databaseIdentity(targetUrl)) {
    throw new Error("Restore target must differ from the source database");
  }
}

export function assertRestorePostgresMajors(
  sourceMajor: number,
  targetMajor: number,
): void {
  if (
    sourceMajor !== BACKUP_POSTGRES_MAJOR ||
    targetMajor !== BACKUP_POSTGRES_MAJOR
  ) {
    throw new Error(
      `Source and restore target must use PostgreSQL ${BACKUP_POSTGRES_MAJOR}`,
    );
  }
}

export async function assertSecureIdentityFile(
  identityFile: string,
): Promise<string> {
  if (!isAbsolute(identityFile)) {
    throw new Error("age identity file path must be absolute");
  }
  const resolved = resolve(identityFile);
  const file = await stat(resolved);
  if (!file.isFile()) {
    throw new Error("age identity path must reference a regular file");
  }
  if ((file.mode & 0o077) !== 0) {
    throw new Error(
      "age identity file must not be accessible by group or other users",
    );
  }
  return resolved;
}

async function postgresServerMajor(pool: Pool): Promise<number> {
  const result = await pool.query<{ serverVersionNum: string }>(
    "select current_setting('server_version_num') as \"serverVersionNum\"",
  );
  const version = result.rows[0]?.serverVersionNum;
  if (version === undefined) {
    throw new Error("PostgreSQL did not return server_version_num");
  }
  return Math.floor(Number.parseInt(version, 10) / 10_000);
}

async function liveDatabaseIdentity(pool: Pool): Promise<string> {
  const result = await pool.query<{
    databaseName: string;
    serverAddress: string | null;
    serverPort: number | null;
  }>(`
    select
      current_database() as "databaseName",
      inet_server_addr()::text as "serverAddress",
      inet_server_port() as "serverPort"
  `);
  const identity = result.rows[0];
  if (identity === undefined) {
    throw new Error("PostgreSQL did not return its live database identity");
  }
  return JSON.stringify(identity);
}

async function listUserTableNames(
  pool: Pool,
): Promise<{ schemaName: string; tableName: string }[]> {
  const result = await pool.query<{
    schemaName: string;
    tableName: string;
  }>(`
    select n.nspname as "schemaName", c.relname as "tableName"
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname not like 'pg_toast%'
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
    order by n.nspname, c.relname
  `);
  return result.rows;
}

async function listNonPublicUserSchemas(pool: Pool): Promise<string[]> {
  const result = await pool.query<{ schemaName: string }>(`
    select nspname as "schemaName"
    from pg_namespace
    where nspname <> 'public'
      and nspname <> 'information_schema'
      and nspname not like 'pg_%'
    order by nspname
  `);
  return result.rows.map((row) => row.schemaName);
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function inventoryUserTables(pool: Pool): Promise<UserTable[]> {
  const tables = await listUserTableNames(pool);
  return Promise.all(
    tables.map(async (table) => {
      const result = await pool.query<{ rowCount: string }>(
        `select count(*)::text as "rowCount" from ${quoteIdentifier(table.schemaName)}.${quoteIdentifier(table.tableName)}`,
      );
      return {
        ...table,
        rowCount: result.rows[0]?.rowCount ?? "0",
      };
    }),
  );
}

async function postgisVersion(pool: Pool): Promise<string> {
  const result = await pool.query<{ version: string }>(
    "select extversion as version from pg_extension where extname = 'postgis'",
  );
  const version = result.rows[0]?.version;
  if (version === undefined) {
    throw new Error("PostGIS extension is not installed");
  }
  return version;
}

async function sha256File(filePath: string): Promise<{
  bytes: number;
  sha256: string;
}> {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(filePath)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    hash.update(buffer);
  }
  return { bytes, sha256: hash.digest("hex") };
}

function assertManifestObjectRelationship(
  prefix: string,
  manifestKey: string,
  manifest: BackupManifest,
): void {
  const expectedObjectKey = manifestKey.replace(
    /\.manifest\.json$/,
    ".dump.age",
  );
  if (
    manifest.object.key !== expectedObjectKey ||
    !manifest.object.key.startsWith(buildBackupPrefix(prefix)) ||
    !manifest.object.key.endsWith(".dump.age")
  ) {
    throw new Error("Manifest references an object outside its backup pair");
  }
}

function assertMatchingInventories(
  source: readonly UserTable[],
  restored: readonly UserTable[],
): void {
  if (JSON.stringify(source) !== JSON.stringify(restored)) {
    throw new Error("Restored user-table inventory or row counts do not match");
  }
}

export async function restoreBackup(
  arguments_: readonly string[],
): Promise<void> {
  const config = parseBackupRestoreCliEnv(process.env);
  const restoreArguments = parseRestoreArguments(arguments_);
  const identityFile = await assertSecureIdentityFile(
    restoreArguments.identityFile,
  );
  assertDistinctDatabaseTargets(
    config.DATABASE_URL,
    config.RESTORE_DATABASE_URL,
  );
  assertBackupManifestObjectKey(config.R2_PREFIX, restoreArguments.manifestKey);
  await inspectBackupToolVersions();

  const sourcePool = new Pool({
    application_name: "chinasupply-backup-restore-source",
    connectionString: config.DATABASE_URL,
    max: 1,
  });
  const targetPool = new Pool({
    application_name: "chinasupply-backup-restore-target",
    connectionString: config.RESTORE_DATABASE_URL,
    max: 1,
  });
  const storage = new PrivateObjectStorageService(config);
  const temporaryRoot = await mkdtemp(`${tmpdir()}/chinasupply-restore-`);
  const encryptedPath = `${temporaryRoot}/postgres.dump.age`;

  try {
    const [
      sourceMajor,
      targetMajor,
      targetTables,
      targetSchemas,
      sourceIdentity,
      targetIdentity,
    ] = await Promise.all([
      postgresServerMajor(sourcePool),
      postgresServerMajor(targetPool),
      listUserTableNames(targetPool),
      listNonPublicUserSchemas(targetPool),
      liveDatabaseIdentity(sourcePool),
      liveDatabaseIdentity(targetPool),
    ]);
    if (sourceIdentity === targetIdentity) {
      throw new Error("Restore target resolves to the source database");
    }
    assertRestorePostgresMajors(sourceMajor, targetMajor);
    if (targetTables.length > 0 || targetSchemas.length > 0) {
      throw new Error("Restore target database is not empty");
    }

    const manifest = backupManifestSchema.parse(
      JSON.parse(await storage.getText(restoreArguments.manifestKey)),
    );
    if (manifest.environment !== config.APP_ENV) {
      throw new Error("Backup manifest belongs to a different environment");
    }
    assertManifestObjectRelationship(
      config.R2_PREFIX,
      restoreArguments.manifestKey,
      manifest,
    );

    const head = await storage.head(manifest.object.key);
    if (
      head.contentLength !== manifest.object.bytes ||
      head.metadata.sha256 !== manifest.object.sha256
    ) {
      throw new Error("Encrypted backup HEAD does not match its manifest");
    }
    await storage.downloadToFile(manifest.object.key, encryptedPath);
    const encrypted = await sha256File(encryptedPath);
    if (
      encrypted.bytes !== manifest.object.bytes ||
      encrypted.sha256 !== manifest.object.sha256
    ) {
      throw new Error("Encrypted backup digest does not match its manifest");
    }

    const sourceInventory = await inventoryUserTables(sourcePool);
    const sourcePostgisVersion = await postgisVersion(sourcePool);
    const processEnvironment = {
      LANG: "C.UTF-8",
      PATH: process.env.PATH,
    };
    await runStreamingPipeline({
      source: {
        executable: "age",
        arguments: ["--decrypt", "--identity", identityFile, encryptedPath],
        environment: processEnvironment,
        label: "age",
      },
      destination: {
        executable: "pg_restore",
        arguments: ["--list"],
        environment: processEnvironment,
        label: "pg_restore --list",
      },
      timeoutMs: BACKUP_TIMEOUT_MS,
      secrets: [config.DATABASE_URL, config.RESTORE_DATABASE_URL, identityFile],
    });
    const restorePostgresEnvironment = buildPostgresProcessEnvironment(
      config.RESTORE_DATABASE_URL,
    );
    const restoreDatabaseName = restorePostgresEnvironment.PGDATABASE;
    if (restoreDatabaseName === undefined) {
      throw new Error("Restore target URL is missing a database name");
    }
    const restoreProcessEnvironment: NodeJS.ProcessEnv = {
      ...processEnvironment,
      ...restorePostgresEnvironment,
    };
    await runStreamingPipeline({
      source: {
        executable: "age",
        arguments: ["--decrypt", "--identity", identityFile, encryptedPath],
        environment: processEnvironment,
        label: "age",
      },
      destination: {
        executable: "pg_restore",
        arguments: [
          "--exit-on-error",
          "--no-owner",
          "--no-privileges",
          "--dbname",
          restoreDatabaseName,
        ],
        environment: restoreProcessEnvironment,
        label: "pg_restore",
      },
      timeoutMs: BACKUP_TIMEOUT_MS,
      secrets: [config.DATABASE_URL, config.RESTORE_DATABASE_URL, identityFile],
    });

    const [restoredInventory, restoredPostgisVersion] = await Promise.all([
      inventoryUserTables(targetPool),
      postgisVersion(targetPool),
    ]);
    assertMatchingInventories(sourceInventory, restoredInventory);
    if (sourcePostgisVersion !== restoredPostgisVersion) {
      throw new Error("Restored PostGIS extension version does not match");
    }

    const totalRows = restoredInventory.reduce(
      (total, table) => total + BigInt(table.rowCount),
      0n,
    );
    console.log(
      JSON.stringify({
        manifestKey: restoreArguments.manifestKey,
        objectKey: manifest.object.key,
        postgisVersion: restoredPostgisVersion,
        restoredTables: restoredInventory.length,
        totalRows: totalRows.toString(),
        status: "completed",
      }),
    );
  } finally {
    await Promise.allSettled([
      sourcePool.end(),
      targetPool.end(),
      rm(temporaryRoot, { force: true, recursive: true }),
    ]);
    storage.onModuleDestroy();
  }
}

import "reflect-metadata";

import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Pool } from "pg";
import {
  GenericContainer,
  Network,
  type StartedNetwork,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const runtimeImage = "chinasupply-api:m5-t6";
const database = "backup_e2e";
const restoreDatabase = "backup_e2e_restore";
const databaseUser = "chinasupply";
const databasePassword = "backup_e2e_password";
const minioAccessKey = "backup-e2e-access";
const minioSecretKey = "backup-e2e-secret-key";
const privateBucket = "backup-e2e-private";
const mediaBucket = "backup-e2e-media";

function runWorkspaceCommand(
  arguments_: string[],
  environment: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    arguments_,
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: environment,
    },
  );
  if (result.status !== 0) {
    throw new Error(`${result.stdout}\n${result.stderr}`);
  }
}

function postgresContainer(alias: string): GenericContainer {
  return new GenericContainer("postgis/postgis:17-3.5")
    .withPlatform("linux/amd64")
    .withEnvironment({
      POSTGRES_DB: database,
      POSTGRES_PASSWORD: databasePassword,
      POSTGRES_USER: databaseUser,
    })
    .withNetworkAliases(alias)
    .withExposedPorts(5432)
    .withStartupTimeout(120_000)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    );
}

function internalDatabaseUrl(alias: string, databaseName = database): string {
  return `postgresql://${databaseUser}:${databasePassword}@${alias}:5432/${databaseName}`;
}

function externalDatabaseUrl(
  container: StartedTestContainer,
  databaseName = database,
): string {
  return `postgresql://${databaseUser}:${databasePassword}@${container.getHost()}:${container.getMappedPort(5432)}/${databaseName}`;
}

function runtimeEnvironment(recipient: string): Record<string, string> {
  return {
    APP_ENV: "local",
    BACKUP_AGE_RECIPIENT: recipient,
    BACKUP_ENABLED: "true",
    DATABASE_URL: internalDatabaseUrl("source-db"),
    PORT: "3001",
    R2_ACCESS_KEY_ID: minioAccessKey,
    R2_ACCOUNT_ID: "backup-e2e-account",
    R2_CDN_BASE_URL: "http://minio:9000",
    R2_ENDPOINT: "http://minio:9000",
    R2_MEDIA_BUCKET: mediaBucket,
    R2_PREFIX: "dev",
    R2_PRIVATE_BUCKET: privateBucket,
    R2_SECRET_ACCESS_KEY: minioSecretKey,
    REDIS_URL: "redis://redis:6379",
    RESTORE_DATABASE_URL: internalDatabaseUrl("target-db", restoreDatabase),
    WEB_ORIGIN: "http://localhost:3000",
  };
}

async function stopAll(
  containers: (StartedTestContainer | undefined)[],
  network: StartedNetwork | undefined,
): Promise<void> {
  await Promise.allSettled(containers.map((container) => container?.stop()));
  await network?.stop();
}

describe.sequential("encrypted PostgreSQL backup and restore", () => {
  it("backs up core and Payload schemas through Redis and MinIO, then restores them with age", async () => {
    let network: StartedNetwork | undefined;
    let source: StartedTestContainer | undefined;
    let target: StartedTestContainer | undefined;
    let redis: StartedTestContainer | undefined;
    let minio: StartedTestContainer | undefined;
    let utility: StartedTestContainer | undefined;
    let worker: StartedTestContainer | undefined;
    let api: StartedTestContainer | undefined;
    let storage: S3Client | undefined;
    let sourcePool: Pool | undefined;
    let targetPool: Pool | undefined;
    const keyDirectory = await mkdtemp(join(tmpdir(), "backup-e2e-keys-"));
    await chmod(keyDirectory, 0o777);

    try {
      network = await new Network().start();
      [source, target, redis, minio] = await Promise.all([
        postgresContainer("source-db").withNetwork(network).start(),
        postgresContainer("target-db").withNetwork(network).start(),
        new GenericContainer("redis:7.4-alpine")
          .withNetwork(network)
          .withNetworkAliases("redis")
          .withExposedPorts(6379)
          .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
          .start(),
        new GenericContainer("minio/minio:RELEASE.2025-04-22T22-12-26Z")
          .withNetwork(network)
          .withNetworkAliases("minio")
          .withEnvironment({
            MINIO_ROOT_PASSWORD: minioSecretKey,
            MINIO_ROOT_USER: minioAccessKey,
          })
          .withCommand(["server", "/data", "--console-address", ":9001"])
          .withExposedPorts(9000)
          .withWaitStrategy(Wait.forHttp("/minio/health/ready", 9000))
          .start(),
      ]);

      const sourceUrl = externalDatabaseUrl(source);
      const targetAdminPool = new Pool({
        connectionString: externalDatabaseUrl(target),
      });
      await targetAdminPool.query(
        `create database ${restoreDatabase} template template0`,
      );
      await targetAdminPool.end();
      const targetUrl = externalDatabaseUrl(target, restoreDatabase);
      const migrationEnvironment = {
        ...process.env,
        APP_ENV: "local",
        DATABASE_URL: sourceUrl,
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        PAYLOAD_SECRET: "backup_e2e_payload_secret_at_least_32_chars",
      };
      runWorkspaceCommand(
        ["--filter", "@chinasupply/web", "cms:migrate"],
        migrationEnvironment,
      );
      runWorkspaceCommand(
        ["--filter", "@chinasupply/api", "db:migrate"],
        migrationEnvironment,
      );
      sourcePool = new Pool({ connectionString: sourceUrl });
      targetPool = new Pool({ connectionString: targetUrl });
      await sourcePool.query(
        `insert into regions (id, level, name, centroid)
           values (
             'backupregion000000000',
             'city',
             '{"en":"Backup City","zh":"备份城市"}'::jsonb,
             ST_SetSRID(ST_MakePoint(120.1, 30.2), 4326)
           )`,
      );

      const r2Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
      storage = new S3Client({
        region: "auto",
        endpoint: r2Endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: minioAccessKey,
          secretAccessKey: minioSecretKey,
        },
      });
      await Promise.all([
        storage.send(new CreateBucketCommand({ Bucket: privateBucket })),
        storage.send(new CreateBucketCommand({ Bucket: mediaBucket })),
      ]);

      utility = await new GenericContainer(runtimeImage)
        .withNetwork(network)
        .withEntrypoint(["sh", "-c"])
        .withCommand(["echo utility-ready; sleep 3600"])
        .withBindMounts([{ source: keyDirectory, target: "/keys", mode: "rw" }])
        .withWaitStrategy(Wait.forLogMessage(/utility-ready/))
        .start();
      const keyGeneration = await utility.exec([
        "sh",
        "-c",
        "umask 077; age-keygen -o /keys/identity.agekey >/dev/null 2>&1; age-keygen -y /keys/identity.agekey; age-keygen -o /keys/wrong.agekey >/dev/null 2>&1",
      ]);
      expect(keyGeneration.exitCode).toBe(0);
      const recipient = keyGeneration.output.trim();
      expect(recipient).toMatch(/^age1/);

      const versions = await utility.exec([
        "sh",
        "-c",
        "node --version; pnpm --version; pg_dump --version; pg_restore --version; age --version",
      ]);
      expect(versions.exitCode).toBe(0);
      expect(versions.output).toMatch(/^v22\.23\.1$/m);
      expect(versions.output).toMatch(/^10\.33\.2$/m);
      expect(versions.output.match(/PostgreSQL\) 17\./g)).toHaveLength(2);
      expect(versions.output).toMatch(/^v?1\.3\.0$/m);

      const environment = runtimeEnvironment(recipient);
      api = await new GenericContainer(runtimeImage)
        .withNetwork(network)
        .withEnvironment({ ...environment, SERVICE_ROLE: "api" })
        .withExposedPorts(3001)
        .withWaitStrategy(Wait.forHttp("/health/live", 3001))
        .start();
      await expect(
        fetch(
          `http://${api.getHost()}:${api.getMappedPort(3001)}/health/live`,
        ).then((response) => response.status),
      ).resolves.toBe(200);

      worker = await new GenericContainer(runtimeImage)
        .withNetwork(network)
        .withEnvironment({ ...environment, SERVICE_ROLE: "worker" })
        .withWaitStrategy(Wait.forLogMessage(/BullMQ worker is ready/))
        .start();

      const manualBackup = await utility.exec(
        [
          "node",
          "--enable-source-maps",
          "dist/backup-run.js",
          "--confirm-local",
        ],
        { env: environment },
      );
      expect(manualBackup.exitCode).toBe(0);
      const backup = JSON.parse(manualBackup.output.trim()) as {
        bytes: number;
        objectKey: string;
        sha256: string;
        status: string;
      };
      expect(backup).toMatchObject({
        status: "completed",
      });
      expect(backup.objectKey).toMatch(
        /^dev\/backups\/postgres\/\d{4}\/\d{2}\/\d{2}\/.+\.dump\.age$/,
      );
      expect(backup.sha256).toMatch(/^[a-f0-9]{64}$/);

      const listed = await storage.send(
        new ListObjectsV2Command({
          Bucket: privateBucket,
          Prefix: "dev/backups/postgres/",
        }),
      );
      const keys = listed.Contents?.flatMap((object) =>
        object.Key === undefined ? [] : [object.Key],
      );
      expect(keys).toHaveLength(2);
      const manifestKey = keys?.find((key) => key.endsWith(".manifest.json"));
      expect(manifestKey).toBeDefined();
      const head = await storage.send(
        new HeadObjectCommand({
          Bucket: privateBucket,
          Key: backup.objectKey,
        }),
      );
      expect(head.ContentLength).toBe(backup.bytes);
      expect(head.Metadata?.sha256).toBe(backup.sha256);

      const manifestResponse = await storage.send(
        new GetObjectCommand({
          Bucket: privateBucket,
          Key: manifestKey!,
        }),
      );
      const originalManifest = await manifestResponse.Body!.transformToString();

      const wrongIdentity = await utility.exec(
        [
          "node",
          "--enable-source-maps",
          "dist/backup-restore.js",
          "--manifest-key",
          manifestKey!,
          "--identity-file",
          "/keys/wrong.agekey",
          "--confirm-isolated-target",
        ],
        { env: environment },
      );
      expect(wrongIdentity.exitCode).not.toBe(0);

      const tampered = JSON.parse(originalManifest) as {
        object: { sha256: string };
      };
      tampered.object.sha256 = "b".repeat(64);
      await storage.send(
        new PutObjectCommand({
          Bucket: privateBucket,
          Key: manifestKey,
          Body: `${JSON.stringify(tampered)}\n`,
          ContentType: "application/json",
        }),
      );
      const digestMismatch = await utility.exec(
        [
          "node",
          "--enable-source-maps",
          "dist/backup-restore.js",
          "--manifest-key",
          manifestKey!,
          "--identity-file",
          "/keys/identity.agekey",
          "--confirm-isolated-target",
        ],
        { env: environment },
      );
      expect(digestMismatch.exitCode).not.toBe(0);
      expect(`${digestMismatch.output}\n${digestMismatch.stderr}`).toMatch(
        /HEAD does not match/,
      );
      await storage.send(
        new PutObjectCommand({
          Bucket: privateBucket,
          Key: manifestKey,
          Body: originalManifest,
          ContentType: "application/json",
        }),
      );

      const restore = await utility.exec(
        [
          "node",
          "--enable-source-maps",
          "dist/backup-restore.js",
          "--manifest-key",
          manifestKey!,
          "--identity-file",
          "/keys/identity.agekey",
          "--confirm-isolated-target",
        ],
        { env: environment },
      );
      if (restore.exitCode !== 0) {
        throw new Error(
          `Restore command failed:\n${restore.output}\n${restore.stderr}`,
        );
      }
      expect(JSON.parse(restore.output.trim())).toMatchObject({
        status: "completed",
      });

      const [sourceTables, targetTables, sourceRows, targetRows, extensions] =
        await Promise.all([
          sourcePool.query<{ tableName: string }>(
            `select schemaname || '.' || tablename as "tableName"
               from pg_tables
               where schemaname not in ('pg_catalog', 'information_schema')
                 and tablename <> 'spatial_ref_sys'
               order by schemaname, tablename`,
          ),
          targetPool.query<{ tableName: string }>(
            `select schemaname || '.' || tablename as "tableName"
               from pg_tables
               where schemaname not in ('pg_catalog', 'information_schema')
                 and tablename <> 'spatial_ref_sys'
               order by schemaname, tablename`,
          ),
          sourcePool.query<{ count: string }>(
            "select count(*)::text as count from regions",
          ),
          targetPool.query<{ count: string }>(
            "select count(*)::text as count from regions",
          ),
          targetPool.query<{ extname: string }>(
            `select extname from pg_extension
               where extname in ('postgis', 'pg_trgm')
               order by extname`,
          ),
        ]);
      expect(targetTables.rows).toEqual(sourceTables.rows);
      expect(targetRows.rows).toEqual(sourceRows.rows);
      expect(targetTables.rows.map((row) => row.tableName)).toEqual(
        expect.arrayContaining([
          "drizzle.__drizzle_migrations",
          "public.articles",
          "public.cms_users",
          "public.payload_migrations",
          "public.regions",
        ]),
      );
      expect(extensions.rows.map((row) => row.extname)).toEqual([
        "pg_trgm",
        "postgis",
      ]);

      const nonEmptyRetry = await utility.exec(
        [
          "node",
          "dist/backup-restore.js",
          "--manifest-key",
          manifestKey!,
          "--identity-file",
          "/keys/identity.agekey",
          "--confirm-isolated-target",
        ],
        { env: environment },
      );
      expect(nonEmptyRetry.exitCode).not.toBe(0);
      expect(`${nonEmptyRetry.output}\n${nonEmptyRetry.stderr}`).toMatch(
        /not empty/,
      );
    } finally {
      await Promise.allSettled([sourcePool?.end(), targetPool?.end()]);
      storage?.destroy();
      await stopAll(
        [api, worker, utility, minio, redis, target, source],
        network,
      );
      await rm(keyDirectory, { force: true, recursive: true });
    }
  }, 360_000);
});

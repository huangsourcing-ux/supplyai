import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Inject, Injectable } from "@nestjs/common";

import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";
import { DatabaseService } from "../database/database.service.js";
import {
  PRIVATE_OBJECT_STORAGE_CONFIG,
  type PrivateObjectStorageConfig,
  PrivateObjectStorageService,
} from "../imports/private-object-storage.service.js";
import { BACKUP_CONFIG, type BackupConfig } from "./backup-config.module.js";
import {
  BACKUP_MANIFEST_VERSION,
  BACKUP_POSTGRES_MAJOR,
  BACKUP_RETENTION_MS,
  BACKUP_TIMEOUT_MS,
} from "./backup.constants.js";
import {
  buildBackupObjectKeys,
  buildBackupPrefix,
  selectExpiredBackupObjectKeys,
} from "./backup-object-keys.js";
import {
  backupJobResultSchema,
  backupManifestSchema,
  type BackupJobData,
  type BackupJobResult,
} from "./backup.schemas.js";
import {
  buildPostgresProcessEnvironment,
  inspectBackupToolVersions,
  runStreamingPipeline,
  type ToolVersions,
} from "./backup-tools.js";

async function sha256File(
  filePath: string,
  abortSignal: AbortSignal,
): Promise<{
  bytes: number;
  sha256: string;
}> {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(filePath)) {
    abortSignal.throwIfAborted();
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    hash.update(buffer);
  }
  return { bytes, sha256: hash.digest("hex") };
}

@Injectable()
export class BackupService {
  private toolVersions: ToolVersions | undefined;

  constructor(
    @Inject(BACKUP_CONFIG) private readonly backupConfig: BackupConfig,
    @Inject(RUNTIME_CONFIG) private readonly runtimeConfig: RuntimeConfig,
    @Inject(PRIVATE_OBJECT_STORAGE_CONFIG)
    private readonly storageConfig: PrivateObjectStorageConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PrivateObjectStorageService)
    private readonly storage: PrivateObjectStorageService,
  ) {}

  async assertToolchain(): Promise<ToolVersions> {
    const serverMajor = await this.database.postgresServerMajor();
    if (serverMajor !== BACKUP_POSTGRES_MAJOR) {
      throw new Error(
        `Backup source PostgreSQL must use major ${BACKUP_POSTGRES_MAJOR}`,
      );
    }
    this.toolVersions ??= await inspectBackupToolVersions();
    return this.toolVersions;
  }

  async run(input: {
    data: BackupJobData;
    jobTimestamp: number;
    now?: Date;
  }): Promise<BackupJobResult> {
    if (
      !this.backupConfig.BACKUP_ENABLED ||
      this.backupConfig.BACKUP_AGE_RECIPIENT === undefined
    ) {
      throw new Error("Database backups are disabled");
    }
    const toolVersions = await this.assertToolchain();
    const createdAt = new Date(input.jobTimestamp);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Backup job has an invalid timestamp");
    }
    const keys = buildBackupObjectKeys({
      prefix: this.storageConfig.R2_PREFIX,
      createdAt,
    });
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "chinasupply-backup-"),
    );
    const encryptedPath = join(temporaryDirectory, "postgres.dump.age");
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(new Error("Backup job timed out")),
      BACKUP_TIMEOUT_MS,
    );

    try {
      await runStreamingPipeline({
        source: {
          executable: "pg_dump",
          arguments: [
            "--format=custom",
            "--no-owner",
            "--no-privileges",
            "--compress=gzip:6",
          ],
          environment: {
            LANG: "C.UTF-8",
            PATH: process.env.PATH,
            ...buildPostgresProcessEnvironment(this.runtimeConfig.DATABASE_URL),
          },
          label: "pg_dump",
        },
        destination: {
          executable: "age",
          arguments: [
            "--encrypt",
            "--recipient",
            this.backupConfig.BACKUP_AGE_RECIPIENT,
            "--output",
            encryptedPath,
          ],
          environment: {
            LANG: "C.UTF-8",
            PATH: process.env.PATH,
          },
          label: "age",
        },
        timeoutMs: BACKUP_TIMEOUT_MS,
        secrets: [this.runtimeConfig.DATABASE_URL],
      });

      const encrypted = await sha256File(encryptedPath, abortController.signal);
      await this.storage.putFile(
        keys.objectKey,
        encryptedPath,
        "application/octet-stream",
        {
          sha256: encrypted.sha256,
          "created-at": createdAt.toISOString(),
          format: "age",
        },
        abortController.signal,
      );
      const objectHead = await this.storage.head(
        keys.objectKey,
        abortController.signal,
      );
      if (
        objectHead.contentLength !== encrypted.bytes ||
        objectHead.metadata.sha256 !== encrypted.sha256
      ) {
        throw new Error("Encrypted backup failed R2 HEAD verification");
      }

      const manifest = backupManifestSchema.parse({
        version: BACKUP_MANIFEST_VERSION,
        environment: this.runtimeConfig.APP_ENV,
        createdAt: createdAt.toISOString(),
        trigger: input.data.trigger,
        sourceCommit:
          this.runtimeConfig.RAILWAY_GIT_COMMIT_SHA ??
          this.runtimeConfig.SENTRY_RELEASE ??
          "local",
        archive: {
          format: "postgres-custom",
          postgresServerMajor: BACKUP_POSTGRES_MAJOR,
          pgDumpVersion: toolVersions.pgDumpVersion,
          pgRestoreVersion: toolVersions.pgRestoreVersion,
        },
        encryption: {
          ageVersion: toolVersions.ageVersion,
          format: "age-x25519",
        },
        object: {
          key: keys.objectKey,
          bytes: encrypted.bytes,
          sha256: encrypted.sha256,
        },
      });
      const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`;
      await this.storage.put(
        keys.manifestObjectKey,
        manifestBody,
        "application/json",
        abortController.signal,
      );
      const manifestHead = await this.storage.head(
        keys.manifestObjectKey,
        abortController.signal,
      );
      if (manifestHead.contentLength !== Buffer.byteLength(manifestBody)) {
        throw new Error("Backup manifest failed R2 HEAD verification");
      }

      const listed = await this.storage.list(
        buildBackupPrefix(this.storageConfig.R2_PREFIX),
        abortController.signal,
      );
      const expired = selectExpiredBackupObjectKeys(listed, {
        prefix: this.storageConfig.R2_PREFIX,
        now: input.now ?? new Date(),
        retentionMs: BACKUP_RETENTION_MS,
      });
      await this.storage.deleteMany(expired, abortController.signal);

      return backupJobResultSchema.parse({
        objectKey: keys.objectKey,
        manifestObjectKey: keys.manifestObjectKey,
        bytes: encrypted.bytes,
        sha256: encrypted.sha256,
        deletedExpiredObjects: expired.length,
      });
    } finally {
      clearTimeout(timeout);
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  }
}

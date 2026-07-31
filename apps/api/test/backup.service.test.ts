import { writeFile } from "node:fs/promises";

import type { RuntimeConfig } from "../src/config/runtime-config.module.js";
import type { DatabaseService } from "../src/database/database.service.js";
import type {
  PrivateObjectStorageConfig,
  PrivateObjectStorageService,
} from "../src/imports/private-object-storage.service.js";
import { BackupService } from "../src/backups/backup.service.js";
import * as backupTools from "../src/backups/backup-tools.js";
import { afterEach, describe, expect, it, vi } from "vitest";

const recipient = `age1${"q".repeat(58)}`;
const runtimeConfig = {
  APP_ENV: "staging",
  DATABASE_URL: "postgresql://source:secret@db.internal/chinasupply",
  RAILWAY_GIT_COMMIT_SHA: "a".repeat(40),
} as RuntimeConfig;
const storageConfig = {
  APP_ENV: "staging",
  R2_ACCESS_KEY_ID: "access-key",
  R2_ACCOUNT_ID: "account-id",
  R2_PRIVATE_BUCKET: "private-bucket",
  R2_PREFIX: "staging",
  R2_SECRET_ACCESS_KEY: "secret-key",
} as PrivateObjectStorageConfig;

describe("BackupService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup(input?: {
    deleteFailure?: boolean;
    headFailure?: boolean;
    headMismatch?: boolean;
    pipelineFailure?: boolean;
    serverMajor?: number;
    uploadFailure?: boolean;
  }) {
    let encryptedMetadata: Record<string, string> = {};
    let encryptedBytes = 0;
    let manifestBody = "";
    const storage = {
      deleteMany: vi.fn(async () => {
        if (input?.deleteFailure) {
          throw new Error("delete failed");
        }
      }),
      head: vi.fn(async (key: string) => {
        if (input?.headFailure) {
          throw new Error("HEAD failed");
        }
        if (key.endsWith(".dump.age")) {
          return {
            contentLength: input?.headMismatch
              ? encryptedBytes + 1
              : encryptedBytes,
            metadata: encryptedMetadata,
          };
        }
        return {
          contentLength: Buffer.byteLength(manifestBody),
          metadata: {},
        };
      }),
      list: vi.fn(async () => [
        {
          key: "staging/backups/postgres/expired.dump.age",
          lastModified: new Date("2026-06-01T00:00:00.000Z"),
          size: 10,
        },
        {
          key: "staging/imports/never-delete.csv",
          lastModified: new Date("2026-06-01T00:00:00.000Z"),
          size: 10,
        },
      ]),
      put: vi.fn(async (_key: string, body: string) => {
        manifestBody = body;
      }),
      putFile: vi.fn(
        async (
          _key: string,
          filePath: string,
          _contentType: string,
          metadata: Record<string, string>,
        ) => {
          if (input?.uploadFailure) {
            throw new Error("upload failed");
          }
          encryptedMetadata = metadata;
          encryptedBytes = Buffer.byteLength(
            await import("node:fs/promises").then(({ readFile }) =>
              readFile(filePath),
            ),
          );
          return encryptedBytes;
        },
      ),
    };
    const database = {
      postgresServerMajor: vi.fn(async () => input?.serverMajor ?? 17),
    };
    vi.spyOn(backupTools, "inspectBackupToolVersions").mockResolvedValue({
      ageVersion: "v1.3.0",
      pgDumpVersion: "pg_dump (PostgreSQL) 17.5",
      pgRestoreVersion: "pg_restore (PostgreSQL) 17.5",
    });
    vi.spyOn(backupTools, "runStreamingPipeline").mockImplementation(
      async ({ destination }) => {
        if (input?.pipelineFailure) {
          throw new Error("pipeline failed");
        }
        const outputIndex = destination.arguments.indexOf("--output");
        const output = destination.arguments[outputIndex + 1];
        if (output === undefined) {
          throw new Error("missing encrypted output");
        }
        await writeFile(output, "encrypted-custom-archive");
      },
    );
    const service = new BackupService(
      {
        APP_ENV: "staging",
        BACKUP_AGE_RECIPIENT: recipient,
        BACKUP_ENABLED: true,
      },
      runtimeConfig,
      storageConfig,
      database as unknown as DatabaseService,
      storage as unknown as PrivateObjectStorageService,
    );
    return { database, service, storage };
  }

  it("uploads, HEAD-verifies, manifests, and cleans only expired backups", async () => {
    const { service, storage } = setup();
    const result = await service.run({
      data: { version: 1, trigger: "scheduled" },
      jobTimestamp: Date.parse("2026-07-30T03:00:00.000Z"),
      now: new Date("2026-07-30T12:00:00.000Z"),
    });
    expect(result.objectKey).toBe(
      "staging/backups/postgres/2026/07/30/2026-07-30T03-00-00-000Z.dump.age",
    );
    expect(result.deletedExpiredObjects).toBe(1);
    expect(storage.deleteMany).toHaveBeenCalledWith(
      ["staging/backups/postgres/expired.dump.age"],
      expect.any(AbortSignal),
    );
    expect(storage.put).toHaveBeenCalledWith(
      result.manifestObjectKey,
      expect.stringContaining('"postgresServerMajor": 17'),
      "application/json",
      expect.any(AbortSignal),
    );
  });

  it("uses the same object pair when BullMQ retries the same job timestamp", async () => {
    const { service, storage } = setup();
    const input = {
      data: { version: 1, trigger: "manual" } as const,
      jobTimestamp: Date.parse("2026-07-30T03:00:00.000Z"),
    };
    const first = await service.run(input);
    const second = await service.run(input);
    expect(second.objectKey).toBe(first.objectKey);
    expect(new Set(storage.putFile.mock.calls.map((call) => call[0]))).toEqual(
      new Set([first.objectKey]),
    );
  });

  it("fails on source version, pipeline, HEAD, and retention cleanup errors", async () => {
    await expect(
      setup({ serverMajor: 16 }).service.run({
        data: { version: 1, trigger: "manual" },
        jobTimestamp: Date.now(),
      }),
    ).rejects.toThrow(/major 17/);

    const pipeline = setup({ pipelineFailure: true });
    await expect(
      pipeline.service.run({
        data: { version: 1, trigger: "manual" },
        jobTimestamp: Date.now(),
      }),
    ).rejects.toThrow(/pipeline failed/);
    expect(pipeline.storage.putFile).not.toHaveBeenCalled();

    await expect(
      setup({ uploadFailure: true }).service.run({
        data: { version: 1, trigger: "manual" },
        jobTimestamp: Date.now(),
      }),
    ).rejects.toThrow(/upload failed/);

    await expect(
      setup({ headFailure: true }).service.run({
        data: { version: 1, trigger: "manual" },
        jobTimestamp: Date.now(),
      }),
    ).rejects.toThrow(/HEAD failed/);

    await expect(
      setup({ headMismatch: true }).service.run({
        data: { version: 1, trigger: "manual" },
        jobTimestamp: Date.now(),
      }),
    ).rejects.toThrow(/HEAD verification/);

    await expect(
      setup({ deleteFailure: true }).service.run({
        data: { version: 1, trigger: "manual" },
        jobTimestamp: Date.now(),
      }),
    ).rejects.toThrow(/delete failed/);
  });
});

import type { Job } from "bullmq";
import { describe, expect, it, vi } from "vitest";

import { BackupProcessor } from "../src/backups/backup.processor.js";
import type { BackupService } from "../src/backups/backup.service.js";
import { BACKUP_DAILY_JOB } from "../src/backups/backup.constants.js";

describe("BackupProcessor", () => {
  it("validates and dispatches the stable BullMQ job timestamp", async () => {
    const run = vi.fn<BackupService["run"]>().mockResolvedValue({
      objectKey: "staging/backups/postgres/a.dump.age",
      manifestObjectKey: "staging/backups/postgres/a.manifest.json",
      bytes: 42,
      sha256: "a".repeat(64),
      deletedExpiredObjects: 0,
    });
    const processor = new BackupProcessor({
      run,
    } as unknown as BackupService);

    await expect(
      processor.process({
        data: { version: 1, trigger: "scheduled" },
        id: "scheduler-job",
        name: BACKUP_DAILY_JOB,
        timestamp: 1_785_380_400_000,
      } as Job<unknown>),
    ).resolves.toMatchObject({ bytes: 42 });
    expect(run).toHaveBeenCalledWith({
      data: { version: 1, trigger: "scheduled" },
      jobTimestamp: 1_785_380_400_000,
    });
  });

  it("rejects unsupported jobs and invalid payloads", async () => {
    const processor = new BackupProcessor({
      run: vi.fn(),
    } as unknown as BackupService);
    await expect(
      processor.process({
        data: {},
        name: "other",
      } as Job<unknown>),
    ).rejects.toThrow(/Unsupported maintenance job/);
    await expect(
      processor.process({
        data: {},
        name: BACKUP_DAILY_JOB,
      } as Job<unknown>),
    ).rejects.toThrow();
  });
});

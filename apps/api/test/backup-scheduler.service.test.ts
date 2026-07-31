import type { Queue } from "bullmq";
import { describe, expect, it, vi } from "vitest";

import { BackupSchedulerService } from "../src/backups/backup-scheduler.service.js";
import type { BackupService } from "../src/backups/backup.service.js";
import {
  BACKUP_CRON_PATTERN,
  BACKUP_CRON_TIMEZONE,
  BACKUP_DAILY_SCHEDULER,
} from "../src/backups/backup.constants.js";

describe("BackupSchedulerService", () => {
  it("upserts the same UTC scheduler ID on repeated bootstrap", async () => {
    const upsertJobScheduler = vi.fn().mockResolvedValue({
      delay: 86_400_000,
      timestamp: 1_785_380_400_000,
    });
    const setGlobalConcurrency = vi.fn().mockResolvedValue(undefined);
    const assertToolchain = vi.fn().mockResolvedValue({});
    const scheduler = new BackupSchedulerService(
      {
        APP_ENV: "staging",
        BACKUP_ENABLED: true,
        BACKUP_AGE_RECIPIENT: `age1${"q".repeat(58)}`,
      },
      { setGlobalConcurrency, upsertJobScheduler } as unknown as Queue,
      { assertToolchain } as unknown as BackupService,
    );

    await scheduler.onApplicationBootstrap();
    await scheduler.onApplicationBootstrap();

    expect(assertToolchain).toHaveBeenCalledTimes(2);
    expect(setGlobalConcurrency).toHaveBeenCalledTimes(2);
    expect(setGlobalConcurrency).toHaveBeenCalledWith(1);
    expect(upsertJobScheduler).toHaveBeenCalledTimes(2);
    for (const call of upsertJobScheduler.mock.calls) {
      expect(call[0]).toBe(BACKUP_DAILY_SCHEDULER);
      expect(call[1]).toEqual({
        pattern: BACKUP_CRON_PATTERN,
        tz: BACKUP_CRON_TIMEZONE,
      });
    }
  });

  it("does not inspect tools or create a scheduler when locally disabled", async () => {
    const upsertJobScheduler = vi.fn();
    const setGlobalConcurrency = vi.fn();
    const assertToolchain = vi.fn();
    const scheduler = new BackupSchedulerService(
      { APP_ENV: "local", BACKUP_ENABLED: false },
      { setGlobalConcurrency, upsertJobScheduler } as unknown as Queue,
      { assertToolchain } as unknown as BackupService,
    );
    await scheduler.onApplicationBootstrap();
    expect(upsertJobScheduler).not.toHaveBeenCalled();
    expect(setGlobalConcurrency).not.toHaveBeenCalled();
    expect(assertToolchain).not.toHaveBeenCalled();
  });
});

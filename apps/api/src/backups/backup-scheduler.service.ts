import { InjectQueue } from "@nestjs/bullmq";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import type { Queue } from "bullmq";

import { BACKUP_CONFIG, type BackupConfig } from "./backup-config.module.js";
import { BackupService } from "./backup.service.js";
import {
  BACKUP_ATTEMPTS,
  BACKUP_CRON_PATTERN,
  BACKUP_CRON_TIMEZONE,
  BACKUP_DAILY_JOB,
  BACKUP_DAILY_SCHEDULER,
  MAINTENANCE_QUEUE,
} from "./backup.constants.js";

@Injectable()
export class BackupSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackupSchedulerService.name);

  constructor(
    @Inject(BACKUP_CONFIG) private readonly config: BackupConfig,
    @InjectQueue(MAINTENANCE_QUEUE)
    private readonly queue: Queue,
    @Inject(BackupService) private readonly backupService: BackupService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.BACKUP_ENABLED) {
      this.logger.log("Daily PostgreSQL backups are disabled");
      return;
    }

    await this.backupService.assertToolchain();
    await this.queue.setGlobalConcurrency(1);
    const scheduledJob = await this.queue.upsertJobScheduler(
      BACKUP_DAILY_SCHEDULER,
      {
        pattern: BACKUP_CRON_PATTERN,
        tz: BACKUP_CRON_TIMEZONE,
      },
      {
        name: BACKUP_DAILY_JOB,
        data: { version: 1, trigger: "scheduled" },
        opts: {
          attempts: BACKUP_ATTEMPTS,
          backoff: { type: "exponential", delay: 60_000 },
          removeOnComplete: { count: 31 },
          removeOnFail: { count: 100 },
        },
      },
    );
    const nextRunAt = scheduledJob.timestamp + scheduledJob.delay;
    this.logger.log(
      `Upserted ${BACKUP_DAILY_SCHEDULER}; next run ${new Date(nextRunAt).toISOString()}`,
    );
  }
}

import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import { BackupService } from "./backup.service.js";
import { BACKUP_DAILY_JOB, MAINTENANCE_QUEUE } from "./backup.constants.js";
import {
  backupJobDataSchema,
  backupJobResultSchema,
  type BackupJobResult,
} from "./backup.schemas.js";

@Processor(MAINTENANCE_QUEUE, { concurrency: 1 })
export class BackupProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupProcessor.name);

  constructor(
    @Inject(BackupService) private readonly backupService: BackupService,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<BackupJobResult> {
    if (job.name !== BACKUP_DAILY_JOB) {
      throw new Error(`Unsupported maintenance job: ${job.name}`);
    }

    const data = backupJobDataSchema.parse(job.data);
    const result = backupJobResultSchema.parse(
      await this.backupService.run({
        data,
        jobTimestamp: job.timestamp,
      }),
    );
    this.logger.log(
      `Completed ${job.name} job ${job.id ?? "unknown"}: ${result.objectKey} (${result.bytes} bytes)`,
    );
    return result;
  }
}

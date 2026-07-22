import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";

import { SYSTEM_PING_JOB, SYSTEM_QUEUE } from "./system.constants.js";
import { systemPingDataSchema } from "./system-ping.schema.js";

export interface SystemPingResult {
  ok: true;
  processedAt: string;
}

@Processor(SYSTEM_QUEUE)
export class SystemProcessor extends WorkerHost {
  private readonly logger = new Logger(SystemProcessor.name);

  async process(job: Job<unknown>): Promise<SystemPingResult> {
    if (job.name !== SYSTEM_PING_JOB) {
      throw new Error(`Unsupported system job: ${job.name}`);
    }

    systemPingDataSchema.parse(job.data);
    const result: SystemPingResult = {
      ok: true,
      processedAt: new Date().toISOString(),
    };

    this.logger.log(`Completed ${job.name} job ${job.id ?? "unknown"}`);
    return result;
  }
}

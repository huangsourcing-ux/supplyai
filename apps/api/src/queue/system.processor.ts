import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";

import {
  searchTextRegenerationJobDataSchema,
  searchTextRegenerationJobResultSchema,
  type SearchTextRegenerationJobResult,
} from "./search-text-regeneration.job.js";
import { SearchTextRegenerationService } from "./search-text-regeneration.service.js";
import {
  REGENERATE_SEARCH_TEXT_JOB,
  SYSTEM_PING_JOB,
  SYSTEM_QUEUE,
} from "./system.constants.js";
import { systemPingDataSchema } from "./system-ping.schema.js";

export interface SystemPingResult {
  ok: true;
  processedAt: string;
}

@Processor(SYSTEM_QUEUE)
export class SystemProcessor extends WorkerHost {
  private readonly logger = new Logger(SystemProcessor.name);

  constructor(
    @Inject(SearchTextRegenerationService)
    private readonly searchText: SearchTextRegenerationService,
  ) {
    super();
  }

  async process(
    job: Job<unknown>,
  ): Promise<SearchTextRegenerationJobResult | SystemPingResult> {
    if (job.name === REGENERATE_SEARCH_TEXT_JOB) {
      const data = searchTextRegenerationJobDataSchema.parse(job.data);
      const result = searchTextRegenerationJobResultSchema.parse(
        await this.searchText.regenerate(data),
      );
      this.logger.log(`Completed ${job.name} job ${job.id ?? "unknown"}`);
      return result;
    }

    if (job.name === SYSTEM_PING_JOB) {
      systemPingDataSchema.parse(job.data);
      const result: SystemPingResult = {
        ok: true,
        processedAt: new Date().toISOString(),
      };

      this.logger.log(`Completed ${job.name} job ${job.id ?? "unknown"}`);
      return result;
    }

    throw new Error(`Unsupported system job: ${job.name}`);
  }
}

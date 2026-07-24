import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import {
  importJobDataSchema,
  importJobResultSchema,
  type ImportJobResult,
} from "@chinasupply/schemas";
import type { Job } from "bullmq";

import { IMPORT_JOB_BY_ENTITY, IMPORT_QUEUE } from "./import.constants.js";
import { ImportService } from "./import.service.js";

@Processor(IMPORT_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(@Inject(ImportService) private readonly imports: ImportService) {
    super();
  }

  async process(job: Job<unknown>): Promise<ImportJobResult> {
    const data = importJobDataSchema.parse(job.data);
    if (job.name !== IMPORT_JOB_BY_ENTITY[data.entity]) {
      throw new Error(
        `Import job name ${job.name} does not match entity ${data.entity}`,
      );
    }

    this.logger.log(`Processing ${job.name} job ${job.id ?? data.importId}`);
    return importJobResultSchema.parse(await this.imports.process(data));
  }
}

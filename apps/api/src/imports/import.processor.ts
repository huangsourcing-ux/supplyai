import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import {
  geocodeFactoriesJobDataSchema,
  geocodeFactoriesJobResultSchema,
  importJobDataSchema,
  importJobResultSchema,
  type GeocodeFactoriesJobResult,
  type ImportJobResult,
} from "@chinasupply/schemas";
import type { Job } from "bullmq";

import { AmapGeocodingFatalError } from "./amap-geocoding.client.js";
import { GeocodeFactoriesService } from "./geocode-factories.service.js";
import {
  GEOCODE_FACTORIES_JOB,
  IMPORT_JOB_BY_ENTITY,
  IMPORT_QUEUE,
} from "./import.constants.js";
import { ImportService } from "./import.service.js";

@Processor(IMPORT_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    @Inject(ImportService) private readonly imports: ImportService,
    @Inject(GeocodeFactoriesService)
    private readonly geocodeFactories: GeocodeFactoriesService,
  ) {
    super();
  }

  async process(
    job: Job<unknown>,
  ): Promise<ImportJobResult | GeocodeFactoriesJobResult> {
    if (job.name === GEOCODE_FACTORIES_JOB) {
      const data = geocodeFactoriesJobDataSchema.parse(job.data);
      this.logger.log(`Processing ${job.name} job ${job.id ?? data.geocodeId}`);
      try {
        return geocodeFactoriesJobResultSchema.parse(
          await this.geocodeFactories.process(data),
        );
      } catch (error) {
        if (error instanceof AmapGeocodingFatalError) {
          await job.discard();
        }
        throw error;
      }
    }

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

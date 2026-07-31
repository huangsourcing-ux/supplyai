import { describe, expect, it, vi } from "vitest";
import { IMPORT_CONTRACT_VERSION } from "@chinasupply/schemas";
import type { Job } from "bullmq";

import { AmapGeocodingFatalError } from "../src/imports/amap-geocoding.client.js";
import { GeocodeFactoriesService } from "../src/imports/geocode-factories.service.js";
import {
  GEOCODE_FACTORIES_JOB,
  IMPORT_QUEUE,
} from "../src/imports/import.constants.js";
import { ImportProcessor } from "../src/imports/import.processor.js";
import { ImportService } from "../src/imports/import.service.js";

describe("ImportProcessor factory geocoding dispatch", () => {
  it("discards provider-fatal jobs after client retries so BullMQ does not exceed the request cap", async () => {
    const imports = { process: vi.fn() };
    const geocodeFactories = {
      process: vi.fn(async () => {
        throw new AmapGeocodingFatalError(
          "10003",
          "Amap geocoding failed (10003)",
        );
      }),
    };
    const discard = vi.fn(async () => undefined);
    const processor = new ImportProcessor(
      imports as unknown as ImportService,
      geocodeFactories as unknown as GeocodeFactoriesService,
    );
    const job = {
      id: "geocode00000000000000",
      name: GEOCODE_FACTORIES_JOB,
      queueName: IMPORT_QUEUE,
      discard,
      data: {
        version: IMPORT_CONTRACT_VERSION,
        geocodeId: "geocode00000000000000",
        sourceFormat: "json",
        sourceObjectKey:
          "dev/imports/geocode-factories/geocode00000000000000/source.json",
        reportObjectKey:
          "dev/imports/geocode-factories/geocode00000000000000/report.json",
      },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).rejects.toMatchObject({
      code: "10003",
    });
    expect(discard).toHaveBeenCalledOnce();
    expect(imports.process).not.toHaveBeenCalled();
  });
});

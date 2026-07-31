import { describe, expect, it, vi } from "vitest";
import {
  IMPORT_CONTRACT_VERSION,
  geocodeFactoriesReportSchema,
  type GeocodeFactoriesJobData,
} from "@chinasupply/schemas";

import { AmapGeocodingClient } from "../src/imports/amap-geocoding.client.js";
import { GeocodeFactoriesService } from "../src/imports/geocode-factories.service.js";
import { ImportPersistenceService } from "../src/imports/import-persistence.service.js";
import { PrivateObjectStorageService } from "../src/imports/private-object-storage.service.js";

const job: GeocodeFactoriesJobData = {
  version: IMPORT_CONTRACT_VERSION,
  geocodeId: "geocode00000000000000",
  sourceFormat: "json",
  sourceObjectKey:
    "dev/imports/geocode-factories/geocode00000000000000/source.json",
  reportObjectKey:
    "dev/imports/geocode-factories/geocode00000000000000/report.json",
};

function geocodeRow() {
  return {
    slug: "duplicate-geocode-factory",
    name: { en: "Duplicate Geocode Factory", zh: "重复地理编码工厂" },
    regionId: "region000000000000000",
    address: {
      en: "6 Futong East Street, Beijing, China",
      zh: "北京市朝阳区阜通东大街6号",
    },
    mainProducts: [{ en: "Components", zh: "零部件" }],
  };
}

describe("GeocodeFactoriesService", () => {
  it("rejects every duplicate slug before provider calls and omits raw source rows", async () => {
    let reportBody = "";
    const storage = {
      getText: vi.fn(async () =>
        JSON.stringify({
          version: 1,
          rows: [geocodeRow(), geocodeRow()],
        }),
      ),
      put: vi.fn(async (_key: string, body: string | Uint8Array) => {
        reportBody =
          typeof body === "string" ? body : new TextDecoder().decode(body);
      }),
    };
    const persistence = { saveFactory: vi.fn() };
    const geocoding = { geocode: vi.fn() };
    const service = new GeocodeFactoriesService(
      storage as unknown as PrivateObjectStorageService,
      persistence as unknown as ImportPersistenceService,
      geocoding as unknown as AmapGeocodingClient,
    );

    const result = await service.process(job);
    const report = geocodeFactoriesReportSchema.parse(JSON.parse(reportBody));

    expect(result.totals).toEqual({
      received: 2,
      inserted: 0,
      updated: 0,
      failed: 2,
    });
    expect(
      report.failures.every((failure) =>
        failure.issues.some((issue) => issue.code === "duplicate_slug"),
      ),
    ).toBe(true);
    expect(reportBody).not.toContain("Duplicate Geocode Factory");
    expect(geocoding.geocode).not.toHaveBeenCalled();
    expect(persistence.saveFactory).not.toHaveBeenCalled();
  });
});

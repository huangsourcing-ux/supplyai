import { describe, expect, it } from "vitest";

import {
  IMPORT_CONTRACT_VERSION,
  clusterImportRowSchema,
  factoryGeocodeRowSchema,
  factoryImportRowSchema,
  geocodeFactoriesJobDataSchema,
  geocodeFactoriesReportSchema,
  importJobDataSchema,
  importReportSchema,
} from "./imports.js";

const regionId = "region000000000000000";

describe("import contracts", () => {
  it("normalizes a cluster row and requires the primary category relation", () => {
    const valid = clusterImportRowSchema.parse({
      slug: "lighting-cluster",
      name: { en: "Lighting Cluster", zh: "照明产业带" },
      regionId,
      primaryCategorySlug: "lighting",
      categorySlugs: ["lighting"],
      centroid: [113.2, 23.1],
      summary: { en: "Lighting makers", zh: "照明制造商" },
      mainProducts: [],
    });

    expect(valid).toMatchObject({
      boundary: null,
      coverImage: null,
      description: null,
      stats: null,
    });
    expect(() =>
      clusterImportRowSchema.parse({
        ...valid,
        categorySlugs: ["furniture"],
      }),
    ).toThrow(/primaryCategorySlug/);
  });

  it("normalizes a factory row without exposing service-owned fields", () => {
    const valid = factoryImportRowSchema.parse({
      slug: "bright-factory",
      name: { en: "Bright Factory", zh: "光明工厂" },
      regionId,
      address: { en: "Shenzhen", zh: "深圳" },
      location: [114.1, 22.5],
      mainProducts: [{ en: "LED lights", zh: "LED 灯" }],
    });

    expect(valid).toMatchObject({
      categorySlugs: [],
      certifications: [],
      clusterSlug: null,
      contact: null,
      images: [],
    });
    expect(
      factoryImportRowSchema.safeParse({ ...valid, verified: true }).success,
    ).toBe(false);
  });

  it("accepts coordinate-less geocoding rows without weakening factory storage", () => {
    const valid = factoryGeocodeRowSchema.parse({
      slug: "geocoded-factory",
      name: { en: "Geocoded Factory", zh: "地理编码工厂" },
      regionId,
      address: {
        en: "6 Futong East Street, Beijing, China",
        zh: "北京市朝阳区阜通东大街6号",
      },
      mainProducts: [{ en: "Components", zh: "零部件" }],
    });

    expect(valid).not.toHaveProperty("location");
    expect(
      factoryGeocodeRowSchema.safeParse({
        ...valid,
        location: [116.48, 39.99],
      }).success,
    ).toBe(false);
    expect(factoryImportRowSchema.safeParse(valid).success).toBe(false);
    expect(
      factoryGeocodeRowSchema.safeParse({ ...valid, verified: false }).success,
    ).toBe(false);
  });

  it("validates queue payloads and reports", () => {
    const job = importJobDataSchema.parse({
      version: IMPORT_CONTRACT_VERSION,
      importId: "import000000000000000",
      entity: "clusters",
      sourceFormat: "json",
      sourceCoordinateSystem: "gcj02",
      sourceObjectKey: "dev/imports/clusters/import000000000000000/source.json",
      reportObjectKey: "dev/imports/clusters/import000000000000000/report.json",
    });
    const report = importReportSchema.parse({
      ...job,
      startedAt: "2026-07-24T12:00:00.000Z",
      finishedAt: "2026-07-24T12:00:01.000Z",
      totals: { received: 1, inserted: 0, updated: 0, failed: 1 },
      successes: [],
      failures: [
        {
          row: 1,
          slug: "bad-row",
          issues: [
            {
              path: ["regionId"],
              code: "invalid_reference",
              message: "Referenced region does not exist",
            },
          ],
        },
      ],
      fatal: null,
    });

    expect(report.failures).toHaveLength(1);
  });

  it("validates factory geocoding queue payloads and private reports", () => {
    const job = geocodeFactoriesJobDataSchema.parse({
      version: IMPORT_CONTRACT_VERSION,
      geocodeId: "geocode00000000000000",
      sourceFormat: "json",
      sourceObjectKey:
        "dev/imports/geocode-factories/geocode00000000000000/source.json",
      reportObjectKey:
        "dev/imports/geocode-factories/geocode00000000000000/report.json",
    });
    const report = geocodeFactoriesReportSchema.parse({
      ...job,
      provider: "amap",
      startedAt: "2026-07-30T12:00:00.000Z",
      finishedAt: "2026-07-30T12:00:01.000Z",
      totals: { received: 1, inserted: 1, updated: 0, failed: 0 },
      successes: [
        {
          row: 1,
          slug: "geocoded-factory",
          action: "inserted",
          candidateCount: 2,
          formattedAddress: "北京市朝阳区阜通东大街6号",
          matchLevel: "门牌号",
          locationGcj02: { lng: 116.48, lat: 39.99 },
          locationWgs84: [116.4738, 39.9886],
        },
      ],
      failures: [],
      fatal: null,
    });

    expect(report.provider).toBe("amap");
    expect(report.successes[0]?.candidateCount).toBe(2);
  });
});

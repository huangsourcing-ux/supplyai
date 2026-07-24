import { describe, expect, it } from "vitest";

import {
  IMPORT_CONTRACT_VERSION,
  clusterImportRowSchema,
  factoryImportRowSchema,
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
});

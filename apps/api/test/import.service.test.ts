import { describe, expect, it, vi } from "vitest";
import {
  IMPORT_CONTRACT_VERSION,
  importReportSchema,
  type ImportJobData,
} from "@chinasupply/schemas";

import { ImportPersistenceService } from "../src/imports/import-persistence.service.js";
import { ImportService } from "../src/imports/import.service.js";
import { PrivateObjectStorageService } from "../src/imports/private-object-storage.service.js";

const job: ImportJobData = {
  version: IMPORT_CONTRACT_VERSION,
  importId: "import000000000000000",
  entity: "clusters",
  sourceFormat: "json",
  sourceCoordinateSystem: "wgs84",
  sourceObjectKey: "dev/imports/clusters/import000000000000000/source.json",
  reportObjectKey: "dev/imports/clusters/import000000000000000/report.json",
};

function clusterRow() {
  return {
    slug: "duplicate-cluster",
    name: { en: "Duplicate Cluster", zh: "重复产业带" },
    regionId: "region000000000000000",
    primaryCategorySlug: "lighting",
    categorySlugs: ["lighting"],
    centroid: [113.2, 23.1],
    summary: { en: "Lighting makers", zh: "照明制造商" },
    mainProducts: [],
  };
}

describe("ImportService", () => {
  it("rejects every duplicate slug and writes no raw row data", async () => {
    let reportBody = "";
    const storage = {
      getText: vi.fn(async () =>
        JSON.stringify({
          version: 1,
          rows: [clusterRow(), clusterRow()],
        }),
      ),
      put: vi.fn(async (_key: string, body: string | Uint8Array) => {
        reportBody =
          typeof body === "string" ? body : new TextDecoder().decode(body);
      }),
    };
    const persistence = {
      saveCluster: vi.fn(),
      saveFactory: vi.fn(),
    };
    const service = new ImportService(
      storage as unknown as PrivateObjectStorageService,
      persistence as unknown as ImportPersistenceService,
    );

    const result = await service.process(job);
    const report = importReportSchema.parse(JSON.parse(reportBody));

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
    expect(reportBody).not.toContain("Duplicate Cluster");
    expect(persistence.saveCluster).not.toHaveBeenCalled();
  });
});

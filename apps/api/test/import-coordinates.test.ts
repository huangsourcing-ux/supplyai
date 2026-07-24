import { describe, expect, it } from "vitest";
import {
  clusterImportRowSchema,
  factoryImportRowSchema,
} from "@chinasupply/schemas";

import {
  normalizeClusterCoordinates,
  normalizeFactoryCoordinates,
} from "../src/imports/import-coordinates.js";

const regionId = "region000000000000000";

describe("import coordinate normalization", () => {
  it("converts every cluster GCJ-02 coordinate without retaining the source", () => {
    const row = clusterImportRowSchema.parse({
      slug: "lighting-cluster",
      name: { en: "Lighting Cluster", zh: "照明产业带" },
      regionId,
      primaryCategorySlug: "lighting",
      categorySlugs: ["lighting"],
      centroid: [116.404, 39.915],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [116.4, 39.91],
              [116.41, 39.91],
              [116.41, 39.92],
              [116.4, 39.91],
            ],
          ],
        ],
      },
      summary: { en: "Lighting makers", zh: "照明制造商" },
      mainProducts: [],
    });

    const normalized = normalizeClusterCoordinates(row, "gcj02");
    expect(normalized.centroid).not.toEqual(row.centroid);
    expect(normalized.boundary?.coordinates[0]?.[0]?.[0]).not.toEqual([
      116.4, 39.91,
    ]);
    expect(normalized.boundary?.coordinates[0]?.[0]?.at(-1)).toEqual(
      normalized.boundary?.coordinates[0]?.[0]?.[0],
    );
  });

  it("retains only factory GCJ-02 source coordinates", () => {
    const row = factoryImportRowSchema.parse({
      slug: "bright-factory",
      name: { en: "Bright Factory", zh: "光明工厂" },
      regionId,
      address: { en: "Beijing", zh: "北京" },
      location: [116.404, 39.915],
      mainProducts: [],
    });

    const gcj = normalizeFactoryCoordinates(row, "gcj02");
    expect(gcj.row.location).not.toEqual(row.location);
    expect(gcj.locationGcj02).toEqual({ lng: 116.404, lat: 39.915 });

    const wgs = normalizeFactoryCoordinates(row, "wgs84");
    expect(wgs.row.location).toEqual(row.location);
    expect(wgs.locationGcj02).toBeNull();
  });
});

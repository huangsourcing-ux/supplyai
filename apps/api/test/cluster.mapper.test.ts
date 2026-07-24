import { decodeCursor } from "@chinasupply/schemas";
import { describe, expect, it } from "vitest";

import {
  toPublicClusterDetail,
  type PublicClusterDetailRow,
} from "../src/clusters/cluster.mapper.js";
import { paginateClusterRows } from "../src/clusters/clusters.service.js";
import type { PublicMediaUrlService } from "../src/media/public-media-url.service.js";

const row: PublicClusterDetailRow = {
  boundary: {
    coordinates: [
      [
        [
          [120, 30],
          [121, 30],
          [121, 31],
          [120, 30],
        ],
      ],
    ],
    type: "MultiPolygon",
  },
  centroid: [120.1, 30.2],
  coverImage: "staging/clusters/lighting/cover.webp",
  description: { en: "Long description", zh: "详细介绍" },
  factoryCount: 2,
  id: "clusteraaaaaaaaaaaaaa",
  mainProducts: [{ en: "LED bulbs", zh: "LED 灯泡" }],
  name: { en: "Lighting Cluster", zh: "照明产业带" },
  primaryCategoryColor: "#112233",
  primaryCategoryIcon: "bulb",
  primaryCategoryId: "categoryaaaaaaaaaaaaa",
  primaryCategoryName: { en: "Lighting", zh: "照明" },
  primaryCategoryParentId: null,
  primaryCategorySlug: "lighting",
  primaryCategorySortOrder: 1,
  publishedAt: new Date("2026-07-24T12:00:00.000Z"),
  regionId: "regionaaaaaaaaaaaaaaa",
  regionLevel: "city",
  regionName: { en: "Zhongshan", zh: "中山" },
  slug: "lighting-cluster",
  stats: {
    annualOutputUsd: 1000,
    note: { en: "Estimate", zh: "估算" },
  },
  summary: { en: "Lighting makers", zh: "照明制造商" },
};

const mediaUrls = {
  resolve: (objectKey: string | null) =>
    objectKey === null ? null : `https://cdn.example.com/${objectKey}`,
} as PublicMediaUrlService;

describe("public cluster mapping", () => {
  it("maps localized data, GeoJSON, stats, and media to the frozen DTO", () => {
    const detail = toPublicClusterDetail(
      row,
      [
        {
          color: "#112233",
          icon: "bulb",
          id: "categoryaaaaaaaaaaaaa",
          name: { en: "Lighting", zh: "照明" },
          parentId: null,
          slug: "lighting",
          sortOrder: 1,
        },
      ],
      mediaUrls,
    );

    expect(detail).toMatchObject({
      centroid: { coordinates: [120.1, 30.2], type: "Point" },
      coverImageUrl:
        "https://cdn.example.com/staging/clusters/lighting/cover.webp",
      description: "Long description",
      factoryCount: 2,
      name: "Lighting Cluster",
      stats: { annualOutputUsd: 1000, note: "Estimate" },
    });
    expect(JSON.stringify(detail)).not.toContain("照明");
  });

  it("emits a cursor only when an extra row proves another page exists", () => {
    const publishedAt = new Date("2026-07-24T12:00:00.000Z");
    const rows = [
      { id: "zzzzzzzzzzzzzzzzzzzzz", publishedAt },
      { id: "yyyyyyyyyyyyyyyyyyyyy", publishedAt },
      { id: "xxxxxxxxxxxxxxxxxxxxx", publishedAt },
    ];

    const page = paginateClusterRows(rows, 2);
    expect(page.pageRows).toHaveLength(2);
    expect(decodeCursor(page.nextCursor ?? "")).toEqual({
      sort: ["2026-07-24T12:00:00.000Z", "yyyyyyyyyyyyyyyyyyyyy"],
      v: 1,
    });
    expect(paginateClusterRows(rows.slice(0, 2), 2).nextCursor).toBeNull();
  });
});

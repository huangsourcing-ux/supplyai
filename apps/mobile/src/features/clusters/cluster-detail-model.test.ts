import type {
  GetClusterFactories200,
  GetClusterFactories200DataItem,
} from "@chinasupply/api-client";

import {
  flattenFactoryPages,
  formatClusterFactoryCount,
  formatClusterStats,
  getClusterBoundaryBounds,
  getNextFactoryCursor,
  normalizeClusterSlug,
} from "./cluster-detail-model";

const factory: GetClusterFactories200DataItem = {
  cluster: {
    id: "clu000000000000000001",
    name: "Yiwu Small Commodities",
    slug: "yiwu-small-commodities",
  },
  id: "fac000000000000000001",
  imageUrl: null,
  location: { coordinates: [120.08, 29.31], type: "Point" },
  mainProducts: ["LED gifts"],
  name: "Yiwu Bright Goods Factory",
  publishedAt: "2026-07-01T00:00:00Z",
  region: {
    id: "reg000000000000000001",
    level: "city",
    name: "Yiwu",
  },
  slug: "yiwu-bright-goods",
  verified: true,
};

function page(
  data: GetClusterFactories200DataItem[],
  nextCursor: string | null,
): GetClusterFactories200 {
  return { data, error: null, meta: { nextCursor } };
}

describe("mobile cluster detail model", () => {
  it("formats realtime factory count and optional stats like the Web detail", () => {
    expect(formatClusterFactoryCount(12_345)).toBe("12,345");
    expect(
      formatClusterStats({
        annualOutputUsd: 1_250_000_000,
        exportShare: 0.625,
      }),
    ).toEqual({ annualOutput: "$1.3B", exportShare: "62.5%" });
    expect(formatClusterStats(null)).toEqual({
      annualOutput: null,
      exportShare: null,
    });
  });

  it("finds valid bounds across every MultiPolygon ring", () => {
    expect(
      getClusterBoundaryBounds({
        coordinates: [
          [
            [
              [120, 29],
              [121, 29],
              [121, 30],
              [120, 30],
              [120, 29],
            ],
          ],
          [
            [
              [119.5, 28.5],
              [119.8, 28.5],
              [119.8, 28.8],
              [119.5, 28.8],
              [119.5, 28.5],
            ],
          ],
        ],
        type: "MultiPolygon",
      }),
    ).toEqual([
      [119.5, 28.5],
      [121, 30],
    ]);
    expect(getClusterBoundaryBounds(null)).toBeNull();
  });

  it("uses the opaque next cursor and deduplicates overlapping pages", () => {
    const secondFactory = {
      ...factory,
      id: "fac000000000000000002",
      name: "Yiwu Textile Factory",
      slug: "yiwu-textile-factory",
    };
    const first = page([factory], "opaque-next");
    const second = page([factory, secondFactory], null);

    expect(getNextFactoryCursor(first)).toBe("opaque-next");
    expect(getNextFactoryCursor(second)).toBeUndefined();
    expect(flattenFactoryPages([first, second])).toEqual([
      factory,
      secondFactory,
    ]);
  });

  it("accepts only one valid cluster slug from the route", () => {
    expect(normalizeClusterSlug("yiwu-small-commodities")).toBe(
      "yiwu-small-commodities",
    );
    expect(normalizeClusterSlug(["first-cluster", "ignored"])).toBe(
      "first-cluster",
    );
    expect(normalizeClusterSlug("Invalid Slug")).toBeNull();
    expect(normalizeClusterSlug(undefined)).toBeNull();
  });
});

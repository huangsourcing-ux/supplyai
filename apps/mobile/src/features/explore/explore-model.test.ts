import type {
  GetCategories200DataItem,
  GetClusters200,
  GetClusters200DataItem,
} from "@chinasupply/api-client";

import {
  findRootExploreCategory,
  flattenExploreClusterPages,
  getNextExploreClusterCursor,
  normalizeExploreCategorySlug,
} from "./explore-model";

const category: GetCategories200DataItem = {
  children: [
    {
      color: null,
      icon: "smartphone",
      id: "cat000000000000000002",
      name: "Consumer Electronics",
      parentId: "cat000000000000000001",
      slug: "consumer-electronics",
      sortOrder: 11,
    },
  ],
  color: "#2563EB",
  icon: "cpu",
  id: "cat000000000000000001",
  name: "Electronics",
  parentId: null,
  slug: "electronics",
  sortOrder: 10,
};

const cluster: GetClusters200DataItem = {
  centroid: { coordinates: [113.8, 23.1], type: "Point" },
  coverImageUrl: null,
  factoryCount: 5,
  id: "clu000000000000000001",
  mainProducts: ["Power supplies", "Electronic components"],
  name: "Dongguan Electronic Information",
  primaryCategory: {
    color: category.color,
    icon: category.icon,
    id: category.id,
    name: category.name,
    parentId: null,
    slug: category.slug,
    sortOrder: category.sortOrder,
  },
  publishedAt: "2026-07-25T12:00:00Z",
  region: {
    id: "reg000000000000000001",
    level: "city",
    name: "Dongguan",
  },
  slug: "dongguan-electronic-information",
  summary: "A major electronics manufacturing cluster.",
};

function page(
  data: GetClusters200DataItem[],
  nextCursor: string | null,
): GetClusters200 {
  return { data, error: null, meta: { nextCursor } };
}

describe("Explore category model", () => {
  it("accepts only a valid category slug", () => {
    expect(normalizeExploreCategorySlug("home-textiles")).toBe("home-textiles");
    expect(normalizeExploreCategorySlug(["electronics", "ignored"])).toBe(
      "electronics",
    );
    expect(normalizeExploreCategorySlug("Electronics")).toBeNull();
    expect(normalizeExploreCategorySlug("electronics/parts")).toBeNull();
    expect(normalizeExploreCategorySlug(undefined)).toBeNull();
  });

  it("resolves only an A-7 root category", () => {
    expect(findRootExploreCategory([category], "electronics")).toBe(category);
    expect(
      findRootExploreCategory([category], "consumer-electronics"),
    ).toBeUndefined();
  });

  it("passes through the opaque cursor and deduplicates page edges", () => {
    const secondCluster = {
      ...cluster,
      id: "clu000000000000000002",
      name: "Shenzhen Consumer Electronics",
      slug: "shenzhen-consumer-electronics",
    };
    const firstPage = page([cluster], "opaque.cursor_2");
    const secondPage = page([cluster, secondCluster], null);

    expect(getNextExploreClusterCursor(firstPage)).toBe("opaque.cursor_2");
    expect(getNextExploreClusterCursor(secondPage)).toBeUndefined();
    expect(
      flattenExploreClusterPages([firstPage, secondPage]).map(({ id }) => id),
    ).toEqual([cluster.id, secondCluster.id]);
  });
});

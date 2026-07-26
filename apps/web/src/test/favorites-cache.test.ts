import { describe, expect, it } from "vitest";

import type {
  CreateFavorite200Data,
  GetFavorites200,
  GetFavorites200DataItem,
} from "@chinasupply/api-client";

import {
  flattenFavoritePages,
  getFavoritesQueryKey,
  getNextFavoritesCursor,
  removeFavoriteFromCache,
  type FavoritesInfiniteData,
  upsertFavoriteInCache,
} from "../app/(frontend)/favorites/favorites-cache";

const unavailableFactory: GetFavorites200DataItem = {
  createdAt: "2026-07-26T12:00:00Z",
  id: "fav000000000000000001",
  target: null,
  targetId: "fac000000000000000001",
  targetType: "factory",
};

const clusterFavorite: CreateFavorite200Data = {
  createdAt: "2026-07-26T11:00:00Z",
  id: "fav000000000000000002",
  targetId: "clu000000000000000001",
  targetType: "cluster",
  target: {
    centroid: { coordinates: [113.5, 22.5], type: "Point" },
    coverImageUrl: null,
    factoryCount: 12,
    id: "clu000000000000000001",
    mainProducts: ["Lighting"],
    name: "Lighting Cluster",
    primaryCategory: {
      color: "#0F766E",
      icon: null,
      id: "cat000000000000000001",
      name: "Lighting",
      parentId: null,
      slug: "lighting",
      sortOrder: 1,
    },
    publishedAt: "2026-07-25T12:00:00Z",
    region: {
      id: "reg000000000000000001",
      level: "city",
      name: "Shenzhen",
    },
    slug: "lighting-cluster",
    summary: "Lighting supply base",
  },
};

function page(
  data: GetFavorites200DataItem[],
  nextCursor: string | null,
): GetFavorites200 {
  return { data, error: null, meta: { nextCursor } };
}

describe("favorites cache policy", () => {
  it("isolates cache keys by Clerk user ID and preserves opaque cursors", () => {
    expect(getFavoritesQueryKey("user_a")).toEqual(["favorites", "user_a"]);
    expect(getFavoritesQueryKey("user_b")).toEqual(["favorites", "user_b"]);
    expect(getFavoritesQueryKey("user_a")).not.toEqual(
      getFavoritesQueryKey("user_b"),
    );
    expect(getNextFavoritesCursor(page([], "opaque-next"))).toBe("opaque-next");
    expect(getNextFavoritesCursor(page([], null))).toBeUndefined();
  });

  it("flattens mixed pages in API order and de-duplicates overlapping rows", () => {
    expect(
      flattenFavoritePages([
        page([unavailableFactory], "next"),
        page([unavailableFactory, clusterFavorite], null),
      ]).map(({ id }) => id),
    ).toEqual([unavailableFactory.id, clusterFavorite.id]);
  });

  it("upserts a successful save at the head and removes duplicates", () => {
    const cached: FavoritesInfiniteData = {
      pageParams: [null, "next"],
      pages: [
        page([unavailableFactory], "next"),
        page([clusterFavorite], null),
      ],
    };
    const updated = upsertFavoriteInCache(cached, clusterFavorite);

    expect(updated?.pages[0]?.data.map(({ id }) => id)).toEqual([
      clusterFavorite.id,
      unavailableFactory.id,
    ]);
    expect(updated?.pages[1]?.data).toEqual([]);
  });

  it("supports optimistic removal without mutating the rollback snapshot", () => {
    const cached: FavoritesInfiniteData = {
      pageParams: [null],
      pages: [page([unavailableFactory, clusterFavorite], null)],
    };
    const updated = removeFavoriteFromCache(cached, unavailableFactory.id);

    expect(updated?.pages[0]?.data).toEqual([clusterFavorite]);
    expect(cached.pages[0]?.data).toEqual([
      unavailableFactory,
      clusterFavorite,
    ]);
  });
});

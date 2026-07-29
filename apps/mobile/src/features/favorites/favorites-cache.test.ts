import type {
  CreateFavorite200Data,
  GetFavorites200,
  GetFavorites200DataItem,
} from "@chinasupply/api-client";

import {
  findFavoriteInCache,
  flattenFavoritePages,
  getFavoritesQueryKey,
  getNextFavoritesCursor,
  removeFavoriteFromCache,
  type FavoritesInfiniteData,
  upsertFavoriteInCache,
} from "./favorites-cache";

const favoriteA: GetFavorites200DataItem = {
  createdAt: "2026-07-28T12:00:00Z",
  id: "fav000000000000000001",
  target: null,
  targetId: "fac000000000000000001",
  targetType: "factory",
};
const favoriteB: CreateFavorite200Data = {
  createdAt: "2026-07-28T11:00:00Z",
  id: "fav000000000000000002",
  target: null,
  targetId: "clu000000000000000001",
  targetType: "cluster",
};

function page(
  data: GetFavorites200DataItem[],
  nextCursor: string | null,
): GetFavorites200 {
  return { data, error: null, meta: { nextCursor } };
}

function cache(pages: GetFavorites200[]): FavoritesInfiniteData {
  return { pageParams: [null], pages };
}

describe("mobile favorites cache policy", () => {
  it("isolates query keys by Clerk user and preserves opaque cursors", () => {
    expect(getFavoritesQueryKey("user_a")).toEqual(["favorites", "user_a"]);
    expect(getFavoritesQueryKey("user_b")).not.toEqual(
      getFavoritesQueryKey("user_a"),
    );
    expect(getNextFavoritesCursor(page([], "opaque-next"))).toBe("opaque-next");
    expect(getNextFavoritesCursor(page([], null))).toBeUndefined();
  });

  it("flattens cursor pages without duplicate favorite IDs", () => {
    expect(
      flattenFavoritePages([
        page([favoriteA], "next"),
        page([favoriteA, favoriteB], null),
      ]).map((favorite) => favorite.id),
    ).toEqual([favoriteA.id, favoriteB.id]);
  });

  it("finds, upserts, and removes records without disturbing page metadata", () => {
    const initial = cache([page([favoriteA], null)]);
    expect(
      findFavoriteInCache(initial, "factory", favoriteA.targetId)?.id,
    ).toBe(favoriteA.id);

    const updated = upsertFavoriteInCache(initial, favoriteB);
    expect(updated?.pages[0]?.data.map((favorite) => favorite.id)).toEqual([
      favoriteB.id,
      favoriteA.id,
    ]);
    expect(updated?.pages[0]?.meta.nextCursor).toBeNull();

    const removed = removeFavoriteFromCache(updated, favoriteA.id);
    expect(removed?.pages[0]?.data).toEqual([favoriteB]);
  });
});

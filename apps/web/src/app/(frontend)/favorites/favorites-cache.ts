import type { InfiniteData } from "@tanstack/react-query";

import type {
  CreateFavorite200Data,
  GetFavorites200,
  GetFavorites200DataItem,
} from "@chinasupply/api-client";

export const FAVORITES_PAGE_SIZE = 20;
export const FAVORITES_QUERY_ROOT = ["favorites"] as const;

export type FavoritesPageParam = string | null;
export type FavoritesInfiniteData = InfiniteData<
  GetFavorites200,
  FavoritesPageParam
>;

export function getFavoritesQueryKey(userId: string) {
  return [...FAVORITES_QUERY_ROOT, userId] as const;
}

export function getNextFavoritesCursor(
  page: GetFavorites200,
): string | undefined {
  return page.meta.nextCursor ?? undefined;
}

export function flattenFavoritePages(
  pages: readonly GetFavorites200[],
): GetFavorites200DataItem[] {
  const favorites: GetFavorites200DataItem[] = [];
  const seenIds = new Set<string>();

  for (const page of pages) {
    for (const favorite of page.data) {
      if (seenIds.has(favorite.id)) continue;
      seenIds.add(favorite.id);
      favorites.push(favorite);
    }
  }

  return favorites;
}

export function upsertFavoriteInCache(
  cached: FavoritesInfiniteData | undefined,
  favorite: CreateFavorite200Data,
): FavoritesInfiniteData | undefined {
  const firstPage = cached?.pages[0];
  if (cached === undefined || firstPage === undefined) return cached;

  return {
    ...cached,
    pages: [
      {
        ...firstPage,
        data: [
          favorite,
          ...firstPage.data.filter((item) => item.id !== favorite.id),
        ],
      },
      ...cached.pages.slice(1).map((page) => ({
        ...page,
        data: page.data.filter((item) => item.id !== favorite.id),
      })),
    ],
  };
}

export function removeFavoriteFromCache(
  cached: FavoritesInfiniteData | undefined,
  favoriteId: string,
): FavoritesInfiniteData | undefined {
  if (cached === undefined) return cached;

  return {
    ...cached,
    pages: cached.pages.map((page) => ({
      ...page,
      data: page.data.filter((favorite) => favorite.id !== favoriteId),
    })),
  };
}

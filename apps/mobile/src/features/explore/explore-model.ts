import type {
  GetCategories200DataItem,
  GetClusters200,
  GetClusters200DataItem,
} from "@chinasupply/api-client";

export const EXPLORE_CLUSTER_PAGE_SIZE = 20;
export const EXPLORE_STALE_TIME_MS = 15 * 60 * 1_000;

export function normalizeExploreCategorySlug(
  slug: string | string[] | undefined,
): string | null {
  const normalized = Array.isArray(slug) ? slug[0] : slug;
  if (
    normalized === undefined ||
    normalized.length > 160 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function findRootExploreCategory(
  categories: readonly GetCategories200DataItem[],
  slug: string,
): GetCategories200DataItem | undefined {
  return categories.find(
    (category) => category.parentId === null && category.slug === slug,
  );
}

export function getNextExploreClusterCursor(
  page: GetClusters200,
): string | undefined {
  return page.meta.nextCursor ?? undefined;
}

export function flattenExploreClusterPages(
  pages: readonly GetClusters200[],
): GetClusters200DataItem[] {
  const clusters: GetClusters200DataItem[] = [];
  const seenIds = new Set<string>();

  for (const page of pages) {
    for (const cluster of page.data) {
      if (seenIds.has(cluster.id)) continue;
      seenIds.add(cluster.id);
      clusters.push(cluster);
    }
  }

  return clusters;
}

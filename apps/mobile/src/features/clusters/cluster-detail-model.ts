import type {
  GetCluster200DataBoundary,
  GetCluster200DataStats,
  GetClusterFactories200,
  GetClusterFactories200DataItem,
} from "@chinasupply/api-client";

export const CLUSTER_FACTORY_PAGE_SIZE = 20;
export const CLUSTER_DETAIL_STALE_TIME_MS = 15 * 60 * 1_000;

export interface FormattedClusterStats {
  annualOutput: string | null;
  exportShare: string | null;
}

export type ClusterMapBounds = [[number, number], [number, number]];

export function formatClusterFactoryCount(factoryCount: number): string {
  return new Intl.NumberFormat("en-US").format(factoryCount);
}

export function formatClusterStats(
  stats: GetCluster200DataStats,
): FormattedClusterStats {
  return {
    annualOutput:
      stats?.annualOutputUsd === undefined
        ? null
        : new Intl.NumberFormat("en-US", {
            compactDisplay: "short",
            currency: "USD",
            maximumFractionDigits: 1,
            notation: "compact",
            style: "currency",
          }).format(stats.annualOutputUsd),
    exportShare:
      stats?.exportShare === undefined
        ? null
        : new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 1,
            style: "percent",
          }).format(stats.exportShare),
  };
}

export function getClusterBoundaryBounds(
  boundary: GetCluster200DataBoundary,
): ClusterMapBounds | null {
  if (boundary === null) return null;

  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;

  for (const polygon of boundary.coordinates) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        west = Math.min(west, longitude);
        south = Math.min(south, latitude);
        east = Math.max(east, longitude);
        north = Math.max(north, latitude);
      }
    }
  }

  if (
    ![east, north, south, west].every(Number.isFinite) ||
    east <= west ||
    north <= south
  ) {
    return null;
  }

  return [
    [west, south],
    [east, north],
  ];
}

export function getNextFactoryCursor(
  page: GetClusterFactories200,
): string | undefined {
  return page.meta.nextCursor ?? undefined;
}

export function flattenFactoryPages(
  pages: readonly GetClusterFactories200[],
): GetClusterFactories200DataItem[] {
  const factories: GetClusterFactories200DataItem[] = [];
  const seenIds = new Set<string>();

  for (const page of pages) {
    for (const factory of page.data) {
      if (seenIds.has(factory.id)) continue;
      seenIds.add(factory.id);
      factories.push(factory);
    }
  }

  return factories;
}

export function normalizeClusterSlug(
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

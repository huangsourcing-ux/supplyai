import {
  favoriteItemSchema,
  type FavoriteItem,
  type PublicClusterSummary,
  type PublicFactorySummary,
} from "@chinasupply/schemas";

export interface FavoriteRow {
  createdAt: Date;
  id: string;
  targetId: string;
  targetType: "cluster" | "factory";
}

export interface FavoriteTargetMaps {
  clusters: ReadonlyMap<string, PublicClusterSummary>;
  factories: ReadonlyMap<string, PublicFactorySummary>;
}

export function toFavoriteItem(
  row: FavoriteRow,
  targets: FavoriteTargetMaps,
): FavoriteItem {
  const target =
    row.targetType === "cluster"
      ? (targets.clusters.get(row.targetId) ?? null)
      : (targets.factories.get(row.targetId) ?? null);

  return favoriteItemSchema.parse({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    target,
    targetId: row.targetId,
    targetType: row.targetType,
  });
}

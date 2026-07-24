import {
  type ClusterStats,
  type GeoJsonMultiPolygon,
  type LocalizedText,
  publicClusterDetailSchema,
  publicClusterStatsSchema,
  publicClusterSummarySchema,
} from "@chinasupply/schemas";
import type { z } from "zod";

import {
  toPublicCategorySummary,
  type CategoryRow,
} from "../categories/category.mapper.js";
import type { Wgs84Point } from "../database/postgis.js";
import type { PublicMediaUrlService } from "../media/public-media-url.service.js";

export interface PublicClusterRow {
  centroid: Wgs84Point;
  coverImage: string | null;
  factoryCount: number;
  id: string;
  mainProducts: LocalizedText[];
  name: LocalizedText;
  primaryCategoryColor: string | null;
  primaryCategoryIcon: string | null;
  primaryCategoryId: string;
  primaryCategoryName: LocalizedText;
  primaryCategoryParentId: string | null;
  primaryCategorySlug: string;
  primaryCategorySortOrder: number;
  publishedAt: Date | null;
  regionId: string;
  regionLevel: "city" | "county" | "province";
  regionName: LocalizedText;
  slug: string;
  summary: LocalizedText;
}

export interface PublicClusterDetailRow extends PublicClusterRow {
  boundary: GeoJsonMultiPolygon | null;
  description: LocalizedText | null;
  stats: ClusterStats | null;
}

export type PublicClusterSummary = z.output<typeof publicClusterSummarySchema>;
export type PublicClusterDetail = z.output<typeof publicClusterDetailSchema>;

export function toPublicClusterSummary(
  row: PublicClusterRow,
  mediaUrls: PublicMediaUrlService,
): PublicClusterSummary {
  if (row.publishedAt === null) {
    throw new Error("Published cluster is missing publishedAt");
  }

  return publicClusterSummarySchema.parse({
    centroid: {
      coordinates: [...row.centroid],
      type: "Point",
    },
    coverImageUrl: mediaUrls.resolve(row.coverImage),
    factoryCount: Number(row.factoryCount),
    id: row.id,
    mainProducts: row.mainProducts.map((product) => product.en),
    name: row.name.en,
    primaryCategory: toPublicCategorySummary({
      color: row.primaryCategoryColor,
      icon: row.primaryCategoryIcon,
      id: row.primaryCategoryId,
      name: row.primaryCategoryName,
      parentId: row.primaryCategoryParentId,
      slug: row.primaryCategorySlug,
      sortOrder: row.primaryCategorySortOrder,
    }),
    publishedAt: row.publishedAt.toISOString(),
    region: {
      id: row.regionId,
      level: row.regionLevel,
      name: row.regionName.en,
    },
    slug: row.slug,
    summary: row.summary.en,
  });
}

export function toPublicClusterDetail(
  row: PublicClusterDetailRow,
  categoryRows: readonly CategoryRow[],
  mediaUrls: PublicMediaUrlService,
): PublicClusterDetail {
  const stats =
    row.stats === null
      ? null
      : publicClusterStatsSchema.parse({
          ...(row.stats.annualOutputUsd === undefined
            ? {}
            : { annualOutputUsd: row.stats.annualOutputUsd }),
          ...(row.stats.exportShare === undefined
            ? {}
            : { exportShare: row.stats.exportShare }),
          ...(row.stats.note === undefined ? {} : { note: row.stats.note.en }),
        });

  return publicClusterDetailSchema.parse({
    ...toPublicClusterSummary(row, mediaUrls),
    boundary: row.boundary,
    categories: categoryRows.map(toPublicCategorySummary),
    description: row.description?.en ?? null,
    stats,
  });
}

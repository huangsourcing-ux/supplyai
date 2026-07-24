import {
  decodeCursor,
  encodeCursor,
  type GeoJsonMultiPolygon,
  getClustersQuerySchema,
} from "@chinasupply/schemas";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  isNotNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";

import {
  compareCategoryRows,
  type CategoryRow,
} from "../categories/category.mapper.js";
import { responseWithMeta } from "../common/http/api-envelope.js";
import { DatabaseService } from "../database/database.service.js";
import {
  categories,
  clusterCategories,
  clusters,
  factories,
  regions,
} from "../database/schema.js";
import { PublicMediaUrlService } from "../media/public-media-url.service.js";
import {
  toPublicClusterDetail,
  toPublicClusterSummary,
  type PublicClusterDetail,
  type PublicClusterDetailRow,
  type PublicClusterRow,
} from "./cluster.mapper.js";

type GetClustersQuery = z.output<typeof getClustersQuerySchema>;

export interface ClusterCursorRow {
  id: string;
  publishedAt: Date | null;
}

export function paginateClusterRows<Row extends ClusterCursorRow>(
  rows: readonly Row[],
  limit: number,
): { nextCursor: string | null; pageRows: Row[] } {
  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : [...rows];
  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasNextPage && lastRow?.publishedAt !== null && lastRow !== undefined
      ? encodeCursor({
          sort: [lastRow.publishedAt.toISOString(), lastRow.id],
          v: 1,
        })
      : null;

  return { nextCursor, pageRows };
}

const publishedFactoryCount = sql<number>`(
  select count(*)::integer
  from ${factories}
  where ${factories.clusterId} = ${clusters.id}
    and ${factories.status} = 'published'
    and ${factories.publishedAt} is not null
)`;

const summarySelection = {
  centroid: clusters.centroid,
  coverImage: clusters.coverImage,
  factoryCount: publishedFactoryCount,
  id: clusters.id,
  mainProducts: clusters.mainProducts,
  name: clusters.name,
  primaryCategoryColor: categories.color,
  primaryCategoryIcon: categories.icon,
  primaryCategoryId: categories.id,
  primaryCategoryName: categories.name,
  primaryCategoryParentId: categories.parentId,
  primaryCategorySlug: categories.slug,
  primaryCategorySortOrder: categories.sortOrder,
  publishedAt: clusters.publishedAt,
  regionId: regions.id,
  regionLevel: regions.level,
  regionName: regions.name,
  slug: clusters.slug,
  summary: clusters.summary,
};

@Injectable()
export class ClustersService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PublicMediaUrlService)
    private readonly mediaUrls: PublicMediaUrlService,
  ) {}

  async list(query: GetClustersQuery) {
    const conditions: SQL[] = [
      eq(clusters.status, "published"),
      isNotNull(clusters.publishedAt),
    ];

    if (query.region !== undefined) {
      conditions.push(eq(clusters.regionId, query.region));
    }

    if (query.category !== undefined) {
      conditions.push(
        exists(
          this.database.db
            .select({ value: sql`1` })
            .from(clusterCategories)
            .innerJoin(
              categories,
              eq(clusterCategories.categoryId, categories.id),
            )
            .where(
              and(
                eq(clusterCategories.clusterId, clusters.id),
                eq(categories.slug, query.category),
              ),
            ),
        ),
      );
    }

    if (query.cursor !== undefined) {
      const cursor = decodeCursor(query.cursor);
      const cursorPublishedAt = new Date(cursor.sort[0]);
      const cursorCondition = or(
        lt(clusters.publishedAt, cursorPublishedAt),
        and(
          eq(clusters.publishedAt, cursorPublishedAt),
          lt(clusters.id, cursor.sort[1]),
        ),
      );

      if (cursorCondition !== undefined) {
        conditions.push(cursorCondition);
      }
    }

    const rows = await this.database.db
      .select(summarySelection)
      .from(clusters)
      .innerJoin(regions, eq(clusters.regionId, regions.id))
      .innerJoin(categories, eq(clusters.primaryCategoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(clusters.publishedAt), desc(clusters.id))
      .limit(query.limit + 1);

    const { nextCursor, pageRows } = paginateClusterRows(rows, query.limit);
    const data = pageRows.map((row) =>
      toPublicClusterSummary(row satisfies PublicClusterRow, this.mediaUrls),
    );

    return responseWithMeta(data, { nextCursor });
  }

  async getBySlug(slug: string): Promise<PublicClusterDetail> {
    const rows = await this.database.db
      .select({
        ...summarySelection,
        boundary: sql<GeoJsonMultiPolygon | null>`
          case
            when ${clusters.boundary} is null then null
            else ST_AsGeoJSON(${clusters.boundary})::jsonb
          end
        `,
        description: clusters.description,
        stats: clusters.stats,
      })
      .from(clusters)
      .innerJoin(regions, eq(clusters.regionId, regions.id))
      .innerJoin(categories, eq(clusters.primaryCategoryId, categories.id))
      .where(
        and(
          eq(clusters.slug, slug),
          eq(clusters.status, "published"),
          isNotNull(clusters.publishedAt),
        ),
      )
      .limit(1);
    const row = rows[0];

    if (row === undefined) {
      throw new NotFoundException();
    }

    const categoryRows: CategoryRow[] = await this.database.db
      .select({
        color: categories.color,
        icon: categories.icon,
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
      })
      .from(clusterCategories)
      .innerJoin(categories, eq(clusterCategories.categoryId, categories.id))
      .where(eq(clusterCategories.clusterId, row.id))
      .orderBy(asc(categories.sortOrder), asc(categories.id));

    categoryRows.sort((left, right) => {
      const levelOrder =
        Number(left.parentId !== null) - Number(right.parentId !== null);
      return levelOrder || compareCategoryRows(left, right);
    });

    return toPublicClusterDetail(
      row satisfies PublicClusterDetailRow,
      categoryRows,
      this.mediaUrls,
    );
  }
}

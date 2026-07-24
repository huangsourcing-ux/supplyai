import {
  decodeCursor,
  encodeCursor,
  getFactoriesQuerySchema,
  type PublicFactoryDetail,
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
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";

import type { CategoryRow } from "../categories/category.mapper.js";
import { responseWithMeta } from "../common/http/api-envelope.js";
import { DatabaseService } from "../database/database.service.js";
import {
  categories,
  clusters,
  factories,
  factoryCategories,
  regions,
} from "../database/schema.js";
import { PublicMediaUrlService } from "../media/public-media-url.service.js";
import {
  toPublicFactoryDetail,
  toPublicFactorySummary,
  type PublicFactoryDetailRow,
  type PublicFactoryRow,
} from "./factory.mapper.js";

type GetFactoriesQuery = z.output<typeof getFactoriesQuerySchema>;
type FactoryPaginationQuery = Pick<GetFactoriesQuery, "cursor" | "limit">;

interface FactoryCursorRow {
  id: string;
  publishedAt: Date | null;
}

export function paginateFactoryRows<Row extends FactoryCursorRow>(
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

const summarySelection = {
  clusterId: clusters.id,
  clusterName: clusters.name,
  clusterSlug: clusters.slug,
  id: factories.id,
  images: factories.images,
  location: factories.location,
  mainProducts: factories.mainProducts,
  name: factories.name,
  publishedAt: factories.publishedAt,
  regionId: regions.id,
  regionLevel: regions.level,
  regionName: regions.name,
  slug: factories.slug,
  verified: factories.verified,
};

const publicClusterJoin = and(
  eq(factories.clusterId, clusters.id),
  eq(clusters.status, "published"),
  isNotNull(clusters.publishedAt),
);

function categoryRowOrder(left: CategoryRow, right: CategoryRow): number {
  const levelOrder =
    Number(left.parentId !== null) - Number(right.parentId !== null);

  return (
    levelOrder ||
    left.sortOrder - right.sortOrder ||
    left.slug.localeCompare(right.slug) ||
    left.id.localeCompare(right.id)
  );
}

@Injectable()
export class FactoriesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PublicMediaUrlService)
    private readonly mediaUrls: PublicMediaUrlService,
  ) {}

  async list(query: GetFactoriesQuery) {
    const conditions: SQL[] = [];

    if (query.category !== undefined) {
      conditions.push(
        exists(
          this.database.db
            .select({ value: sql`1` })
            .from(factoryCategories)
            .innerJoin(
              categories,
              eq(factoryCategories.categoryId, categories.id),
            )
            .where(
              and(
                eq(factoryCategories.factoryId, factories.id),
                eq(categories.slug, query.category),
              ),
            ),
        ),
      );
    }

    if (query.cluster !== undefined) {
      conditions.push(eq(clusters.slug, query.cluster));
    }

    if (query.verified !== undefined) {
      conditions.push(eq(factories.verified, query.verified));
    }

    return this.listPublishedRows(query, conditions);
  }

  async listByClusterSlug(slug: string, query: FactoryPaginationQuery) {
    const clusterRows = await this.database.db
      .select({ id: clusters.id })
      .from(clusters)
      .where(
        and(
          eq(clusters.slug, slug),
          eq(clusters.status, "published"),
          isNotNull(clusters.publishedAt),
        ),
      )
      .limit(1);
    const cluster = clusterRows[0];

    if (cluster === undefined) {
      throw new NotFoundException();
    }

    return this.listPublishedRows(query, [eq(factories.clusterId, cluster.id)]);
  }

  async getBySlug(slug: string): Promise<PublicFactoryDetail> {
    const rows = await this.database.db
      .select({
        ...summarySelection,
        address: factories.address,
        certifications: factories.certifications,
        contact: factories.contact,
        employeeRange: factories.employeeRange,
        establishedYear: factories.establishedYear,
        factoryClusterId: factories.clusterId,
        lastVerifiedAt: factories.lastVerifiedAt,
        moq: factories.moq,
        sourceName: factories.sourceName,
        sourceUrl: factories.sourceUrl,
        verifiedAt: factories.verifiedAt,
      })
      .from(factories)
      .innerJoin(regions, eq(factories.regionId, regions.id))
      .leftJoin(clusters, publicClusterJoin)
      .where(
        and(
          eq(factories.slug, slug),
          eq(factories.status, "published"),
          isNotNull(factories.publishedAt),
        ),
      )
      .limit(1);
    const row = rows[0];

    if (row === undefined) {
      throw new NotFoundException();
    }

    const [categoryRows, relatedRows] = await Promise.all([
      this.getCategoryRows(row.id),
      row.clusterId === null || row.factoryClusterId === null
        ? Promise.resolve([])
        : this.getRelatedRows(row.id, row.factoryClusterId),
    ]);

    return toPublicFactoryDetail(
      row satisfies PublicFactoryDetailRow,
      categoryRows,
      relatedRows,
      this.mediaUrls,
    );
  }

  private async getCategoryRows(factoryId: string): Promise<CategoryRow[]> {
    const rows: CategoryRow[] = await this.database.db
      .select({
        color: categories.color,
        icon: categories.icon,
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
      })
      .from(factoryCategories)
      .innerJoin(categories, eq(factoryCategories.categoryId, categories.id))
      .where(eq(factoryCategories.factoryId, factoryId))
      .orderBy(
        asc(categories.sortOrder),
        asc(categories.slug),
        asc(categories.id),
      );

    return rows.sort(categoryRowOrder);
  }

  private async getRelatedRows(
    factoryId: string,
    clusterId: string,
  ): Promise<PublicFactoryRow[]> {
    return this.database.db
      .select(summarySelection)
      .from(factories)
      .innerJoin(regions, eq(factories.regionId, regions.id))
      .leftJoin(clusters, publicClusterJoin)
      .where(
        and(
          eq(factories.clusterId, clusterId),
          ne(factories.id, factoryId),
          eq(factories.status, "published"),
          isNotNull(factories.publishedAt),
        ),
      )
      .orderBy(desc(factories.publishedAt), desc(factories.id))
      .limit(10);
  }

  private async listPublishedRows(
    query: FactoryPaginationQuery,
    additionalConditions: readonly SQL[],
  ) {
    const conditions: SQL[] = [
      eq(factories.status, "published"),
      isNotNull(factories.publishedAt),
      ...additionalConditions,
    ];

    if (query.cursor !== undefined) {
      const cursor = decodeCursor(query.cursor);
      const cursorPublishedAt = new Date(cursor.sort[0]);
      const cursorCondition = or(
        lt(factories.publishedAt, cursorPublishedAt),
        and(
          eq(factories.publishedAt, cursorPublishedAt),
          lt(factories.id, cursor.sort[1]),
        ),
      );

      if (cursorCondition !== undefined) {
        conditions.push(cursorCondition);
      }
    }

    const rows = await this.database.db
      .select(summarySelection)
      .from(factories)
      .innerJoin(regions, eq(factories.regionId, regions.id))
      .leftJoin(clusters, publicClusterJoin)
      .where(and(...conditions))
      .orderBy(desc(factories.publishedAt), desc(factories.id))
      .limit(query.limit + 1);

    const { nextCursor, pageRows } = paginateFactoryRows(rows, query.limit);
    const data = pageRows.map((row) =>
      toPublicFactorySummary(row satisfies PublicFactoryRow, this.mediaUrls),
    );

    return responseWithMeta(data, { nextCursor });
  }
}

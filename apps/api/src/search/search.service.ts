import { type GeoJsonPoint, searchResultSchema } from "@chinasupply/schemas";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { DatabaseService } from "../database/database.service.js";
import { categories, clusters, factories } from "../database/schema.js";
import { buildSearchRanking } from "./search-query.js";

const searchResultLimit = 5;
const countedFactories = alias(factories, "counted_factories");

@Injectable()
export class SearchService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async search(query: string) {
    return this.database.db.transaction(async (transaction) => {
      await transaction.execute(sql`set transaction read only`);
      await transaction.execute(
        sql`set local pg_trgm.word_similarity_threshold = '0.3'`,
      );

      const categoryRanking = buildSearchRanking(
        query,
        categories.searchTextEn,
        categories.searchTextZh,
      );
      const categoryRows = await transaction
        .select({
          color: categories.color,
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        })
        .from(categories)
        .where(categoryRanking.match)
        .orderBy(...categoryRanking.orderBy, asc(categories.id))
        .limit(searchResultLimit);

      const clusterRanking = buildSearchRanking(
        query,
        clusters.searchTextEn,
        clusters.searchTextZh,
      );
      const clusterRows = await transaction
        .select({
          centroid: sql<GeoJsonPoint>`ST_AsGeoJSON(${clusters.centroid})::jsonb`,
          factoryCount: count(countedFactories.id),
          id: clusters.id,
          name: clusters.name,
          slug: clusters.slug,
        })
        .from(clusters)
        .leftJoin(
          countedFactories,
          and(
            eq(countedFactories.clusterId, clusters.id),
            eq(countedFactories.status, "published"),
            isNotNull(countedFactories.publishedAt),
          ),
        )
        .where(
          and(
            eq(clusters.status, "published"),
            isNotNull(clusters.publishedAt),
            clusterRanking.match,
          ),
        )
        .groupBy(clusters.id)
        .orderBy(...clusterRanking.orderBy, asc(clusters.id))
        .limit(searchResultLimit);

      const factoryRanking = buildSearchRanking(
        query,
        factories.searchTextEn,
        factories.searchTextZh,
      );
      const factoryRows = await transaction
        .select({
          id: factories.id,
          location: sql<GeoJsonPoint>`ST_AsGeoJSON(${factories.location})::jsonb`,
          name: factories.name,
          slug: factories.slug,
          verified: factories.verified,
        })
        .from(factories)
        .where(
          and(
            eq(factories.status, "published"),
            isNotNull(factories.publishedAt),
            factoryRanking.match,
          ),
        )
        .orderBy(...factoryRanking.orderBy, asc(factories.id))
        .limit(searchResultLimit);

      return searchResultSchema.parse({
        categories: categoryRows.map((row) => ({
          color: row.color,
          id: row.id,
          name: row.name.en,
          slug: row.slug,
          type: "category",
        })),
        clusters: clusterRows.map((row) => ({
          centroid: row.centroid,
          factoryCount: Number(row.factoryCount),
          id: row.id,
          name: row.name.en,
          slug: row.slug,
          type: "cluster",
        })),
        factories: factoryRows.map((row) => ({
          id: row.id,
          location: row.location,
          name: row.name.en,
          slug: row.slug,
          type: "factory",
          verified: row.verified,
        })),
      });
    });
  }
}

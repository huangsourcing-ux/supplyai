import {
  buildSearchText,
  type LocalizedAliases,
  type LocalizedText,
} from "@chinasupply/schemas";
import { Inject, Injectable } from "@nestjs/common";
import { asc, eq, inArray, sql } from "drizzle-orm";

import { DatabaseService } from "../database/database.service.js";
import {
  categories,
  clusterCategories,
  clusters,
  factories,
  factoryCategories,
} from "../database/schema.js";
import type {
  SearchTextRegenerationJobData,
  SearchTextRegenerationJobResult,
} from "./search-text-regeneration.job.js";

interface SearchCategory {
  aliases: LocalizedAliases;
  name: LocalizedText;
}

function groupCategoriesByEntity(
  rows: readonly {
    aliases: LocalizedAliases;
    entityId: string;
    name: LocalizedText;
  }[],
): Map<string, SearchCategory[]> {
  const grouped = new Map<string, SearchCategory[]>();
  for (const row of rows) {
    const entityCategories = grouped.get(row.entityId) ?? [];
    entityCategories.push({ aliases: row.aliases, name: row.name });
    grouped.set(row.entityId, entityCategories);
  }
  return grouped;
}

@Injectable()
export class SearchTextRegenerationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async regenerate(
    input: SearchTextRegenerationJobData,
  ): Promise<SearchTextRegenerationJobResult> {
    return this.database.db.transaction(async (transaction) => {
      const categoryRows = await transaction
        .select({
          aliases: categories.aliases,
          id: categories.id,
          name: categories.name,
        })
        .from(categories)
        .where(inArray(categories.id, input.categoryIds))
        .orderBy(asc(categories.id));

      if (categoryRows.length !== input.categoryIds.length) {
        const foundIds = new Set(categoryRows.map((category) => category.id));
        const missingIds = input.categoryIds.filter((id) => !foundIds.has(id));
        throw new Error(
          `Search-text regeneration references missing categories: ${missingIds.join(", ")}`,
        );
      }

      for (const category of categoryRows) {
        const searchText = buildSearchText({
          aliases: category.aliases,
          kind: "category",
          name: category.name,
        });
        await transaction
          .update(categories)
          .set({
            ...searchText,
            updatedAt: sql`${categories.updatedAt}`,
          })
          .where(eq(categories.id, category.id));
      }

      const affectedClusterRelations = await transaction
        .select({ entityId: clusterCategories.clusterId })
        .from(clusterCategories)
        .where(inArray(clusterCategories.categoryId, input.categoryIds));
      const affectedClusterIds = [
        ...new Set(
          affectedClusterRelations.map((relation) => relation.entityId),
        ),
      ];
      const clusterRows =
        affectedClusterIds.length === 0
          ? []
          : await transaction
              .select({
                id: clusters.id,
                mainProducts: clusters.mainProducts,
                name: clusters.name,
                summary: clusters.summary,
              })
              .from(clusters)
              .where(inArray(clusters.id, affectedClusterIds))
              .orderBy(asc(clusters.id));
      const clusterCategoryRows =
        affectedClusterIds.length === 0
          ? []
          : await transaction
              .select({
                aliases: categories.aliases,
                entityId: clusterCategories.clusterId,
                name: categories.name,
              })
              .from(clusterCategories)
              .innerJoin(
                categories,
                eq(clusterCategories.categoryId, categories.id),
              )
              .where(inArray(clusterCategories.clusterId, affectedClusterIds))
              .orderBy(
                asc(clusterCategories.clusterId),
                asc(clusterCategories.categoryId),
              );
      const categoriesByCluster = groupCategoriesByEntity(clusterCategoryRows);

      for (const cluster of clusterRows) {
        const relatedCategories = categoriesByCluster.get(cluster.id);
        if (relatedCategories === undefined) {
          throw new Error(`Cluster ${cluster.id} has no category relations`);
        }
        const searchText = buildSearchText({
          categories: relatedCategories,
          kind: "cluster",
          mainProducts: cluster.mainProducts,
          name: cluster.name,
          summary: cluster.summary,
        });
        await transaction
          .update(clusters)
          .set({
            ...searchText,
            updatedAt: sql`${clusters.updatedAt}`,
          })
          .where(eq(clusters.id, cluster.id));
      }

      const affectedFactoryRelations = await transaction
        .select({ entityId: factoryCategories.factoryId })
        .from(factoryCategories)
        .where(inArray(factoryCategories.categoryId, input.categoryIds));
      const affectedFactoryIds = [
        ...new Set(
          affectedFactoryRelations.map((relation) => relation.entityId),
        ),
      ];
      const factoryRows =
        affectedFactoryIds.length === 0
          ? []
          : await transaction
              .select({
                id: factories.id,
                mainProducts: factories.mainProducts,
                name: factories.name,
              })
              .from(factories)
              .where(inArray(factories.id, affectedFactoryIds))
              .orderBy(asc(factories.id));
      const factoryCategoryRows =
        affectedFactoryIds.length === 0
          ? []
          : await transaction
              .select({
                aliases: categories.aliases,
                entityId: factoryCategories.factoryId,
                name: categories.name,
              })
              .from(factoryCategories)
              .innerJoin(
                categories,
                eq(factoryCategories.categoryId, categories.id),
              )
              .where(inArray(factoryCategories.factoryId, affectedFactoryIds))
              .orderBy(
                asc(factoryCategories.factoryId),
                asc(factoryCategories.categoryId),
              );
      const categoriesByFactory = groupCategoriesByEntity(factoryCategoryRows);

      for (const factory of factoryRows) {
        const relatedCategories = categoriesByFactory.get(factory.id);
        if (relatedCategories === undefined) {
          throw new Error(`Factory ${factory.id} has no category relations`);
        }
        const searchText = buildSearchText({
          categories: relatedCategories,
          kind: "factory",
          mainProducts: factory.mainProducts,
          name: factory.name,
        });
        await transaction
          .update(factories)
          .set({
            ...searchText,
            updatedAt: sql`${factories.updatedAt}`,
          })
          .where(eq(factories.id, factory.id));
      }

      return {
        categoriesRegenerated: categoryRows.length,
        clustersRegenerated: clusterRows.length,
        factoriesRegenerated: factoryRows.length,
      };
    });
  }
}

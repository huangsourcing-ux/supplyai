import { Inject, Injectable } from "@nestjs/common";
import {
  buildSearchText,
  type ClusterImportRow,
  type FactoryImportRow,
} from "@chinasupply/schemas";
import { eq, inArray, sql } from "drizzle-orm";

import { DatabaseService } from "../database/database.service.js";
import {
  categories,
  clusterCategories,
  clusters,
  factories,
  factoryCategories,
  regions,
} from "../database/schema.js";

export class ImportRowError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "ImportRowError";
  }
}

export type ImportPersistenceAction = "inserted" | "updated";

function boundarySql(boundary: ClusterImportRow["boundary"]) {
  return boundary === null
    ? null
    : sql`ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326))`;
}

@Injectable()
export class ImportPersistenceService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async saveCluster(row: ClusterImportRow): Promise<ImportPersistenceAction> {
    return this.database.db.transaction(async (transaction) => {
      const [region] = await transaction
        .select({ id: regions.id })
        .from(regions)
        .where(eq(regions.id, row.regionId))
        .limit(1);
      if (region === undefined) {
        throw new ImportRowError(
          "regionId",
          "Referenced region does not exist",
        );
      }

      const categoryRows = await transaction
        .select({
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
          aliases: categories.aliases,
        })
        .from(categories)
        .where(inArray(categories.slug, row.categorySlugs));
      const categoriesBySlug = new Map(
        categoryRows.map((category) => [category.slug, category]),
      );
      const missingCategory = row.categorySlugs.find(
        (slug) => !categoriesBySlug.has(slug),
      );
      if (missingCategory !== undefined) {
        throw new ImportRowError(
          "categorySlugs",
          `Referenced category does not exist: ${missingCategory}`,
        );
      }

      const primaryCategory = categoriesBySlug.get(row.primaryCategorySlug);
      if (primaryCategory === undefined) {
        throw new ImportRowError(
          "primaryCategorySlug",
          "Referenced primary category does not exist",
        );
      }

      const orderedCategories = row.categorySlugs.map((slug) => {
        const category = categoriesBySlug.get(slug);
        if (category === undefined) {
          throw new ImportRowError(
            "categorySlugs",
            `Referenced category does not exist: ${slug}`,
          );
        }
        return category;
      });
      const searchText = buildSearchText({
        kind: "cluster",
        name: row.name,
        mainProducts: row.mainProducts,
        summary: row.summary,
        categories: orderedCategories,
      });
      const [existing] = await transaction
        .select({ id: clusters.id })
        .from(clusters)
        .where(eq(clusters.slug, row.slug))
        .limit(1);

      let clusterId: string;
      let action: ImportPersistenceAction;
      if (existing === undefined) {
        const [created] = await transaction
          .insert(clusters)
          .values({
            slug: row.slug,
            name: row.name,
            regionId: row.regionId,
            primaryCategoryId: primaryCategory.id,
            centroid: row.centroid,
            boundary: boundarySql(row.boundary),
            summary: row.summary,
            description: row.description,
            mainProducts: row.mainProducts,
            coverImage: row.coverImage,
            stats: row.stats,
            ...searchText,
          })
          .returning({ id: clusters.id });
        if (created === undefined) {
          throw new Error("Cluster insert returned no row");
        }
        clusterId = created.id;
        action = "inserted";
      } else {
        clusterId = existing.id;
        await transaction
          .update(clusters)
          .set({
            name: row.name,
            regionId: row.regionId,
            primaryCategoryId: primaryCategory.id,
            centroid: row.centroid,
            boundary: boundarySql(row.boundary),
            summary: row.summary,
            description: row.description,
            mainProducts: row.mainProducts,
            coverImage: row.coverImage,
            stats: row.stats,
            ...searchText,
            updatedAt: new Date(),
          })
          .where(eq(clusters.id, clusterId));
        action = "updated";
      }

      await transaction
        .delete(clusterCategories)
        .where(eq(clusterCategories.clusterId, clusterId));
      await transaction.insert(clusterCategories).values(
        orderedCategories.map((category) => ({
          clusterId,
          categoryId: category.id,
        })),
      );

      return action;
    });
  }

  async saveFactory(
    row: FactoryImportRow,
    locationGcj02: { lng: number; lat: number } | null,
    options: { resetVerification?: boolean } = {},
  ): Promise<ImportPersistenceAction> {
    return this.database.db.transaction(async (transaction) => {
      const [region] = await transaction
        .select({ id: regions.id })
        .from(regions)
        .where(eq(regions.id, row.regionId))
        .limit(1);
      if (region === undefined) {
        throw new ImportRowError(
          "regionId",
          "Referenced region does not exist",
        );
      }

      const categoryRows =
        row.categorySlugs.length === 0
          ? []
          : await transaction
              .select({
                id: categories.id,
                slug: categories.slug,
                name: categories.name,
                aliases: categories.aliases,
              })
              .from(categories)
              .where(inArray(categories.slug, row.categorySlugs));
      const categoriesBySlug = new Map(
        categoryRows.map((category) => [category.slug, category]),
      );
      const missingCategory = row.categorySlugs.find(
        (slug) => !categoriesBySlug.has(slug),
      );
      if (missingCategory !== undefined) {
        throw new ImportRowError(
          "categorySlugs",
          `Referenced category does not exist: ${missingCategory}`,
        );
      }
      const orderedCategories = row.categorySlugs.map((slug) => {
        const category = categoriesBySlug.get(slug);
        if (category === undefined) {
          throw new ImportRowError(
            "categorySlugs",
            `Referenced category does not exist: ${slug}`,
          );
        }
        return category;
      });

      let clusterId: string | null = null;
      if (row.clusterSlug !== null) {
        const [cluster] = await transaction
          .select({ id: clusters.id })
          .from(clusters)
          .where(eq(clusters.slug, row.clusterSlug))
          .limit(1);
        if (cluster === undefined) {
          throw new ImportRowError(
            "clusterSlug",
            `Referenced cluster does not exist: ${row.clusterSlug}`,
          );
        }
        clusterId = cluster.id;
      }

      const searchText = buildSearchText({
        kind: "factory",
        name: row.name,
        mainProducts: row.mainProducts,
        categories: orderedCategories,
      });
      const [existing] = await transaction
        .select({ id: factories.id })
        .from(factories)
        .where(eq(factories.slug, row.slug))
        .limit(1);

      let factoryId: string;
      let action: ImportPersistenceAction;
      const mutableValues = {
        name: row.name,
        clusterId,
        regionId: row.regionId,
        address: row.address,
        location: row.location,
        locationGcj02,
        mainProducts: row.mainProducts,
        certifications: row.certifications,
        moq: row.moq,
        establishedYear: row.establishedYear,
        employeeRange: row.employeeRange,
        contact: row.contact,
        images: row.images,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
        ...searchText,
        ...(options.resetVerification === true
          ? {
              lastVerifiedAt: null,
              verified: false,
              verifiedAt: null,
              verifiedBy: null,
            }
          : {}),
      };

      if (existing === undefined) {
        const [created] = await transaction
          .insert(factories)
          .values({ slug: row.slug, ...mutableValues })
          .returning({ id: factories.id });
        if (created === undefined) {
          throw new Error("Factory insert returned no row");
        }
        factoryId = created.id;
        action = "inserted";
      } else {
        factoryId = existing.id;
        await transaction
          .update(factories)
          .set({ ...mutableValues, updatedAt: new Date() })
          .where(eq(factories.id, factoryId));
        action = "updated";
      }

      await transaction
        .delete(factoryCategories)
        .where(eq(factoryCategories.factoryId, factoryId));
      if (orderedCategories.length > 0) {
        await transaction.insert(factoryCategories).values(
          orderedCategories.map((category) => ({
            factoryId,
            categoryId: category.id,
          })),
        );
      }

      return action;
    });
  }
}

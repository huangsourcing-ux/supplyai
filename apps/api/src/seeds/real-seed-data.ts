import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  IMPORT_CONTRACT_VERSION,
  clusterImportJsonDocumentSchema,
  clusterImportRowSchema,
  factoryImportJsonDocumentSchema,
  factoryImportRowSchema,
  geoJsonMultiPolygonSchema,
  localizedAliasesSchema,
  localizedTextSchema,
  regionLevelSchema,
  slugSchema,
  wgs84PositionSchema,
  type ClusterImportRow,
  type FactoryImportRow,
} from "@chinasupply/schemas";
import { z } from "zod";

const REAL_CLUSTER_COUNT = 10;
const REAL_FACTORY_COUNT = 50;
const FACTORIES_PER_CLUSTER = 5;
const CONTACT_REVIEWED_FACTORY_SLUGS = new Set([
  "nantong-jinkanghong-textile",
  "yiwu-yayu-textile",
]);

export const regionSeedRowSchema = z.strictObject({
  id: z
    .string()
    .length(21)
    .regex(/^[A-Za-z0-9_-]+$/u),
  level: regionLevelSchema,
  name: localizedTextSchema,
  centroid: wgs84PositionSchema,
  boundary: geoJsonMultiPolygonSchema.nullable(),
});

export const categorySeedRowSchema = z.strictObject({
  id: z
    .string()
    .length(21)
    .regex(/^[A-Za-z0-9_-]+$/u),
  parentSlug: slugSchema.nullable(),
  name: localizedTextSchema,
  slug: slugSchema,
  icon: z.string().trim().min(1).nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/u)
    .nullable(),
  aliases: localizedAliasesSchema,
  sortOrder: z.number().int(),
});

const regionSeedDocumentSchema = z.strictObject({
  version: z.literal(IMPORT_CONTRACT_VERSION),
  rows: z.array(regionSeedRowSchema),
});

const categorySeedDocumentSchema = z.strictObject({
  version: z.literal(IMPORT_CONTRACT_VERSION),
  rows: z.array(categorySeedRowSchema),
});

export type RegionSeedRow = z.infer<typeof regionSeedRowSchema>;
export type CategorySeedRow = z.infer<typeof categorySeedRowSchema>;

export interface RealSeedData {
  regions: RegionSeedRow[];
  categories: CategorySeedRow[];
  clusters: ClusterImportRow[];
  factories: FactoryImportRow[];
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique`);
  }
}

export function validateRealSeedData(data: RealSeedData): RealSeedData {
  if (data.clusters.length !== REAL_CLUSTER_COUNT) {
    throw new Error(`Real seed must contain ${REAL_CLUSTER_COUNT} clusters`);
  }
  if (data.factories.length !== REAL_FACTORY_COUNT) {
    throw new Error(`Real seed must contain ${REAL_FACTORY_COUNT} factories`);
  }

  assertUnique(
    data.regions.map((region) => region.id),
    "Region IDs",
  );
  assertUnique(
    data.categories.map((category) => category.id),
    "Category IDs",
  );
  assertUnique(
    data.categories.map((category) => category.slug),
    "Category slugs",
  );
  assertUnique(
    data.clusters.map((cluster) => cluster.slug),
    "Cluster slugs",
  );
  assertUnique(
    data.factories.map((factory) => factory.slug),
    "Factory slugs",
  );

  const regionIds = new Set(data.regions.map((region) => region.id));
  const categoriesBySlug = new Map(
    data.categories.map((category) => [category.slug, category]),
  );
  const clustersBySlug = new Map(
    data.clusters.map((cluster) => [cluster.slug, cluster]),
  );

  for (const category of data.categories) {
    if (category.parentSlug === null) {
      if (category.color === null) {
        throw new Error(`Root category ${category.slug} must define a color`);
      }
      continue;
    }
    if (!categoriesBySlug.has(category.parentSlug)) {
      throw new Error(
        `Category ${category.slug} references missing parent ${category.parentSlug}`,
      );
    }
    if (category.color !== null) {
      throw new Error(
        `Child category ${category.slug} must not define a color`,
      );
    }
  }

  for (const cluster of data.clusters) {
    if (!regionIds.has(cluster.regionId)) {
      throw new Error(
        `Cluster ${cluster.slug} references missing region ${cluster.regionId}`,
      );
    }
    const primaryCategory = categoriesBySlug.get(cluster.primaryCategorySlug);
    if (primaryCategory === undefined) {
      throw new Error(
        `Cluster ${cluster.slug} references missing primary category`,
      );
    }
    if (primaryCategory.parentSlug !== null) {
      throw new Error(
        `Cluster ${cluster.slug} primary category must be a root category`,
      );
    }
    for (const categorySlug of cluster.categorySlugs) {
      if (!categoriesBySlug.has(categorySlug)) {
        throw new Error(
          `Cluster ${cluster.slug} references missing category ${categorySlug}`,
        );
      }
    }
  }

  const factoryCountByCluster = new Map<string, number>();
  for (const factory of data.factories) {
    if (factory.slug.startsWith("synthetic-")) {
      throw new Error(`Real factory ${factory.slug} uses synthetic namespace`);
    }
    if (factory.clusterSlug === null) {
      throw new Error(`Real factory ${factory.slug} must reference a cluster`);
    }
    const cluster = clustersBySlug.get(factory.clusterSlug);
    if (cluster === undefined) {
      throw new Error(
        `Factory ${factory.slug} references missing cluster ${factory.clusterSlug}`,
      );
    }
    if (factory.regionId !== cluster.regionId) {
      throw new Error(
        `Factory ${factory.slug} region must match its cluster region`,
      );
    }
    if (
      factory.contact !== null &&
      Object.keys(factory.contact).some((key) => key !== "website") &&
      !CONTACT_REVIEWED_FACTORY_SLUGS.has(factory.slug)
    ) {
      throw new Error(
        `Factory ${factory.slug} has contact fields without an approved SOP review`,
      );
    }
    if (
      factory.contact?.website !== undefined &&
      !URL.canParse(factory.contact.website)
    ) {
      throw new Error(`Factory ${factory.slug} has an invalid website`);
    }
    factoryCountByCluster.set(
      factory.clusterSlug,
      (factoryCountByCluster.get(factory.clusterSlug) ?? 0) + 1,
    );
  }

  for (const cluster of data.clusters) {
    if (
      (factoryCountByCluster.get(cluster.slug) ?? 0) !== FACTORIES_PER_CLUSTER
    ) {
      throw new Error(
        `Cluster ${cluster.slug} must contain ${FACTORIES_PER_CLUSTER} factories`,
      );
    }
  }

  return data;
}

export async function loadRealSeedData(
  directory: string,
): Promise<RealSeedData> {
  const [regionsValue, categoriesValue, clustersValue, factoriesValue] =
    await Promise.all([
      readJson(join(directory, "regions.json")),
      readJson(join(directory, "categories.json")),
      readJson(join(directory, "clusters.json")),
      readJson(join(directory, "factories.json")),
    ]);

  const regions = regionSeedDocumentSchema.parse(regionsValue).rows;
  const categories = categorySeedDocumentSchema.parse(categoriesValue).rows;
  const clusterDocument = clusterImportJsonDocumentSchema.parse(clustersValue);
  const factoryDocument = factoryImportJsonDocumentSchema.parse(factoriesValue);
  const clusters = clusterDocument.rows.map((row) =>
    clusterImportRowSchema.parse(row),
  );
  const factories = factoryDocument.rows.map((row) =>
    factoryImportRowSchema.parse(row),
  );

  return validateRealSeedData({
    regions,
    categories,
    clusters,
    factories,
  });
}

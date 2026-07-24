import {
  type GeoJsonMultiPolygon,
  getMapClusterBoundariesQuerySchema,
  getMapClusterPointsQuerySchema,
  getMapFactoriesQuerySchema,
  mapClusterBoundariesCollectionSchema,
  mapClusterPointsCollectionSchema,
  mapFactoriesCollectionSchema,
} from "@chinasupply/schemas";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { z } from "zod";

import { responseWithMeta } from "../common/http/api-envelope.js";
import { DatabaseService } from "../database/database.service.js";
import {
  categories,
  clusterCategories,
  clusters,
  factories,
  factoryCategories,
} from "../database/schema.js";
import {
  toMapClusterBoundaryFeature,
  toMapClusterPointFeature,
  toMapFactoryPointFeature,
  type MapClusterBoundaryRow,
  type MapClusterPointRow,
  type MapFactoryPointRow,
} from "./map.mapper.js";

type GetMapClusterPointsQuery = z.output<typeof getMapClusterPointsQuerySchema>;
type GetMapClusterBoundariesQuery = z.output<
  typeof getMapClusterBoundariesQuerySchema
>;
type GetMapFactoriesQuery = z.output<typeof getMapFactoriesQuerySchema>;

export const MAP_FACTORY_LIMIT = 5000;
export const MAP_BOUNDARY_COARSE_TOLERANCE = 0.01;
export const MAP_BOUNDARY_MEDIUM_TOLERANCE = 0.002;

export function getMapBoundaryTolerance(zoom: number): number | null {
  if (zoom < 10) {
    return MAP_BOUNDARY_COARSE_TOLERANCE;
  }

  if (zoom < 12) {
    return MAP_BOUNDARY_MEDIUM_TOLERANCE;
  }

  return null;
}

export function truncateMapFactoryRows<Row>(rows: readonly Row[]): {
  rows: Row[];
  truncated: boolean;
} {
  return {
    rows: rows.slice(0, MAP_FACTORY_LIMIT),
    truncated: rows.length > MAP_FACTORY_LIMIT,
  };
}

const publishedFactoryCount = sql<number>`(
  select count(*)::integer
  from ${factories}
  where ${factories.clusterId} = ${clusters.id}
    and ${factories.status} = 'published'
    and ${factories.publishedAt} is not null
)`;

const mapClusterSelection = {
  color: categories.color,
  factoryCount: publishedFactoryCount,
  id: clusters.id,
  name: clusters.name,
  primaryCategoryId: clusters.primaryCategoryId,
  slug: clusters.slug,
};

const publicClusters = alias(clusters, "public_clusters");
const publicClusterJoin = and(
  eq(factories.clusterId, publicClusters.id),
  eq(publicClusters.status, "published"),
  isNotNull(publicClusters.publishedAt),
);

function clusterCategoryCondition(categorySlug: string): SQL {
  return sql`
    exists (
      select 1
      from ${clusterCategories}
      inner join ${categories}
        on ${clusterCategories.categoryId} = ${categories.id}
      where ${clusterCategories.clusterId} = ${clusters.id}
        and ${categories.slug} = ${categorySlug}
    )
  `;
}

function factoryCategoryCondition(categorySlug: string): SQL {
  return sql`
    exists (
      select 1
      from ${factoryCategories}
      inner join ${categories}
        on ${factoryCategories.categoryId} = ${categories.id}
      where ${factoryCategories.factoryId} = ${factories.id}
        and ${categories.slug} = ${categorySlug}
    )
  `;
}

function viewportCondition(
  geometry: SQL | typeof clusters.boundary | typeof factories.location,
  bbox: readonly [number, number, number, number],
): SQL {
  const [west, south, east, north] = bbox;

  return sql`ST_Intersects(
    ${geometry},
    ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
  )`;
}

@Injectable()
export class MapService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async getClusterPoints(query: GetMapClusterPointsQuery) {
    const conditions: SQL[] = [
      eq(clusters.status, "published"),
      isNotNull(clusters.publishedAt),
    ];

    if (query.category !== undefined) {
      conditions.push(clusterCategoryCondition(query.category));
    }

    const rows = await this.database.db
      .select({
        ...mapClusterSelection,
        centroid: clusters.centroid,
      })
      .from(clusters)
      .innerJoin(categories, eq(clusters.primaryCategoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(clusters.id));

    return mapClusterPointsCollectionSchema.parse({
      features: rows.map((row) =>
        toMapClusterPointFeature(row satisfies MapClusterPointRow),
      ),
      type: "FeatureCollection",
    });
  }

  async getClusterBoundaries(query: GetMapClusterBoundariesQuery) {
    const tolerance = getMapBoundaryTolerance(query.zoom);
    const boundaryGeometry =
      tolerance === null
        ? sql`${clusters.boundary}`
        : sql`ST_Multi(
            ST_SimplifyPreserveTopology(${clusters.boundary}, ${tolerance})
          )`;
    const conditions: SQL[] = [
      eq(clusters.status, "published"),
      isNotNull(clusters.publishedAt),
      isNotNull(clusters.boundary),
      viewportCondition(clusters.boundary, query.bbox),
    ];

    if (query.category !== undefined) {
      conditions.push(clusterCategoryCondition(query.category));
    }

    const rows = await this.database.db
      .select({
        ...mapClusterSelection,
        boundary: sql<GeoJsonMultiPolygon>`
          ST_AsGeoJSON(${boundaryGeometry})::jsonb
        `,
      })
      .from(clusters)
      .innerJoin(categories, eq(clusters.primaryCategoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(clusters.id));

    return mapClusterBoundariesCollectionSchema.parse({
      features: rows.map((row) =>
        toMapClusterBoundaryFeature(row satisfies MapClusterBoundaryRow),
      ),
      type: "FeatureCollection",
    });
  }

  async getFactories(query: GetMapFactoriesQuery) {
    const conditions: SQL[] = [
      eq(factories.status, "published"),
      isNotNull(factories.publishedAt),
      viewportCondition(factories.location, query.bbox),
    ];

    if (query.category !== undefined) {
      conditions.push(factoryCategoryCondition(query.category));
    }

    if (query.cluster !== undefined) {
      conditions.push(eq(publicClusters.slug, query.cluster));
    }

    if (query.verified !== undefined) {
      conditions.push(eq(factories.verified, query.verified));
    }

    const rows = await this.database.db
      .select({
        clusterId: publicClusters.id,
        id: factories.id,
        location: factories.location,
        name: factories.name,
        slug: factories.slug,
        verified: factories.verified,
      })
      .from(factories)
      .leftJoin(publicClusters, publicClusterJoin)
      .where(and(...conditions))
      .orderBy(asc(factories.id))
      .limit(MAP_FACTORY_LIMIT + 1);
    const page = truncateMapFactoryRows(rows);
    const collection = mapFactoriesCollectionSchema.parse({
      features: page.rows.map((row) =>
        toMapFactoryPointFeature(row satisfies MapFactoryPointRow),
      ),
      type: "FeatureCollection",
    });

    return responseWithMeta(collection, { truncated: page.truncated });
  }
}

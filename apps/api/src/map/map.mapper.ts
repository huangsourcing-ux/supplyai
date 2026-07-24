import {
  type GeoJsonMultiPolygon,
  type LocalizedText,
  mapClusterBoundaryFeatureSchema,
  mapClusterPointFeatureSchema,
  mapFactoryPointFeatureSchema,
} from "@chinasupply/schemas";
import type { z } from "zod";

import type { Wgs84Point } from "../database/postgis.js";

export interface MapClusterRow {
  color: string | null;
  factoryCount: number;
  id: string;
  name: LocalizedText;
  primaryCategoryId: string;
  slug: string;
}

export interface MapClusterPointRow extends MapClusterRow {
  centroid: Wgs84Point;
}

export interface MapClusterBoundaryRow extends MapClusterRow {
  boundary: GeoJsonMultiPolygon;
}

export interface MapFactoryPointRow {
  clusterId: string | null;
  id: string;
  location: Wgs84Point;
  name: LocalizedText;
  slug: string;
  verified: boolean;
}

export type MapClusterPointFeature = z.output<
  typeof mapClusterPointFeatureSchema
>;
export type MapClusterBoundaryFeature = z.output<
  typeof mapClusterBoundaryFeatureSchema
>;
export type MapFactoryPointFeature = z.output<
  typeof mapFactoryPointFeatureSchema
>;

function mapClusterProperties(row: MapClusterRow) {
  return {
    color: row.color,
    factoryCount: Number(row.factoryCount),
    id: row.id,
    name_en: row.name.en,
    primaryCategoryId: row.primaryCategoryId,
    slug: row.slug,
  };
}

export function toMapClusterPointFeature(
  row: MapClusterPointRow,
): MapClusterPointFeature {
  return mapClusterPointFeatureSchema.parse({
    geometry: {
      coordinates: [...row.centroid],
      type: "Point",
    },
    properties: mapClusterProperties(row),
    type: "Feature",
  });
}

export function toMapClusterBoundaryFeature(
  row: MapClusterBoundaryRow,
): MapClusterBoundaryFeature {
  return mapClusterBoundaryFeatureSchema.parse({
    geometry: row.boundary,
    properties: mapClusterProperties(row),
    type: "Feature",
  });
}

export function toMapFactoryPointFeature(
  row: MapFactoryPointRow,
): MapFactoryPointFeature {
  return mapFactoryPointFeatureSchema.parse({
    geometry: {
      coordinates: [...row.location],
      type: "Point",
    },
    properties: {
      clusterId: row.clusterId,
      id: row.id,
      name_en: row.name.en,
      slug: row.slug,
      verified: row.verified,
    },
    type: "Feature",
  });
}

import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  emptyMetaSchema,
  mapTruncationMetaSchema,
} from "./envelope.js";
import {
  createGeoJsonFeatureCollectionSchema,
  createGeoJsonFeatureSchema,
  geoJsonMultiPolygonSchema,
  geoJsonPointSchema,
} from "./geojson.js";
import {
  bboxQueryValueSchema,
  booleanQuerySchema,
  zoomQueryValueSchema,
} from "./http-input.js";
import { coreIdSchema, slugSchema } from "./primitives.js";

export const mapClusterPropertiesSchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name_en: z.string().min(1),
  primaryCategoryId: coreIdSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/u),
  factoryCount: z.number().int().nonnegative(),
});

export const mapFactoryPropertiesSchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name_en: z.string().min(1),
  verified: z.boolean(),
  clusterId: coreIdSchema.nullable(),
});

export const mapClusterPointFeatureSchema = createGeoJsonFeatureSchema(
  geoJsonPointSchema,
  mapClusterPropertiesSchema,
);
export const mapClusterBoundaryFeatureSchema = createGeoJsonFeatureSchema(
  geoJsonMultiPolygonSchema,
  mapClusterPropertiesSchema,
);
export const mapFactoryPointFeatureSchema = createGeoJsonFeatureSchema(
  geoJsonPointSchema,
  mapFactoryPropertiesSchema,
);

export const mapClusterPointsCollectionSchema =
  createGeoJsonFeatureCollectionSchema(mapClusterPointFeatureSchema);
export const mapClusterBoundariesCollectionSchema =
  createGeoJsonFeatureCollectionSchema(mapClusterBoundaryFeatureSchema);
export const mapFactoriesCollectionSchema =
  createGeoJsonFeatureCollectionSchema(mapFactoryPointFeatureSchema, 5000);

export const getMapClusterPointsQuerySchema = z.strictObject({
  category: slugSchema.optional(),
});
export const getMapClusterPointsResponseSchema = createSuccessEnvelopeSchema(
  mapClusterPointsCollectionSchema,
  emptyMetaSchema,
);

export const getMapClusterBoundariesQuerySchema = z.strictObject({
  bbox: bboxQueryValueSchema,
  category: slugSchema.optional(),
  zoom: zoomQueryValueSchema,
});
export const getMapClusterBoundariesResponseSchema =
  createSuccessEnvelopeSchema(
    mapClusterBoundariesCollectionSchema,
    emptyMetaSchema,
  );

export const getMapFactoriesQuerySchema = z.strictObject({
  bbox: bboxQueryValueSchema,
  category: slugSchema.optional(),
  cluster: slugSchema.optional(),
  verified: booleanQuerySchema.optional(),
});
export const getMapFactoriesResponseSchema = createSuccessEnvelopeSchema(
  mapFactoriesCollectionSchema,
  mapTruncationMetaSchema,
);

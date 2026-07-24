import { z } from "zod";

const longitudeSchema = z.number().finite().min(-180).max(180);
const latitudeSchema = z.number().finite().min(-90).max(90);

export const wgs84PositionSchema = z.tuple([longitudeSchema, latitudeSchema]);

function positionsEqual(
  left: readonly [number, number],
  right: readonly [number, number],
): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

export const linearRingSchema = z
  .array(wgs84PositionSchema)
  .min(4)
  .superRefine((ring, context) => {
    const first = ring[0];
    const last = ring.at(-1);

    if (
      first === undefined ||
      last === undefined ||
      !positionsEqual(first, last)
    ) {
      context.addIssue({
        code: "custom",
        message: "GeoJSON linear rings must be closed",
      });
    }
  });

export const polygonCoordinatesSchema = z.array(linearRingSchema).min(1);
export const multiPolygonCoordinatesSchema = z
  .array(polygonCoordinatesSchema)
  .min(1);

export const geoJsonPointSchema = z.strictObject({
  type: z.literal("Point"),
  coordinates: wgs84PositionSchema,
});

export const geoJsonMultiPolygonSchema = z.strictObject({
  type: z.literal("MultiPolygon"),
  coordinates: multiPolygonCoordinatesSchema,
});

export function createGeoJsonFeatureSchema<
  Geometry extends z.ZodType,
  Properties extends z.ZodType,
>(geometry: Geometry, properties: Properties) {
  return z.strictObject({
    type: z.literal("Feature"),
    geometry,
    properties,
  });
}

export function createGeoJsonFeatureCollectionSchema<Feature extends z.ZodType>(
  feature: Feature,
  maximumFeatures?: number,
) {
  const featuresSchema =
    maximumFeatures === undefined
      ? z.array(feature)
      : z.array(feature).max(maximumFeatures);

  return z.strictObject({
    type: z.literal("FeatureCollection"),
    features: featuresSchema,
  });
}

export type GeoJsonMultiPolygon = z.infer<typeof geoJsonMultiPolygonSchema>;
export type GeoJsonPoint = z.infer<typeof geoJsonPointSchema>;
export type Wgs84Position = z.infer<typeof wgs84PositionSchema>;

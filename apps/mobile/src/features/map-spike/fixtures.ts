import type { FeatureCollection, Point, Polygon } from "geojson";

export const YIWU_CENTER: [number, number] = [120.075, 29.306];

type SpikeProperties = {
  id: string;
  kind: "cluster-candidate" | "reference-point" | "validation-area";
};

export const referencePoint: FeatureCollection<Point, SpikeProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "yiwu-reference-point",
        kind: "reference-point",
      },
      geometry: {
        type: "Point",
        coordinates: [120.075, 29.306],
      },
    },
  ],
};

export const validationPolygon: FeatureCollection<Polygon, SpikeProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "yiwu-validation-area",
        kind: "validation-area",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [120.045, 29.285],
            [120.105, 29.285],
            [120.105, 29.327],
            [120.045, 29.327],
            [120.045, 29.285],
          ],
        ],
      },
    },
  ],
};

export const clusteredPoints: FeatureCollection<Point, SpikeProperties> = {
  type: "FeatureCollection",
  features: [
    [120.064, 29.314],
    [120.0645, 29.3143],
    [120.065, 29.3138],
    [120.0654, 29.3141],
    [120.088, 29.297],
  ].map((coordinates, index) => ({
    type: "Feature" as const,
    properties: {
      id: `cluster-candidate-${index + 1}`,
      kind: "cluster-candidate" as const,
    },
    geometry: {
      type: "Point" as const,
      coordinates,
    },
  })),
};

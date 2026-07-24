import { gcj02ToWgs84 } from "@chinasupply/geo";
import type {
  ClusterImportRow,
  FactoryImportRow,
  GeoJsonMultiPolygon,
  SourceCoordinateSystem,
  Wgs84Position,
} from "@chinasupply/schemas";

function toWgs84(
  position: Wgs84Position,
  sourceCoordinateSystem: SourceCoordinateSystem,
): Wgs84Position {
  return sourceCoordinateSystem === "gcj02"
    ? gcj02ToWgs84(position)
    : [...position];
}

function convertBoundary(
  boundary: GeoJsonMultiPolygon | null,
  sourceCoordinateSystem: SourceCoordinateSystem,
): GeoJsonMultiPolygon | null {
  if (boundary === null || sourceCoordinateSystem === "wgs84") {
    return boundary;
  }

  return {
    type: "MultiPolygon",
    coordinates: boundary.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map((position) => toWgs84(position, sourceCoordinateSystem)),
      ),
    ),
  };
}

export function normalizeClusterCoordinates(
  row: ClusterImportRow,
  sourceCoordinateSystem: SourceCoordinateSystem,
): ClusterImportRow {
  return {
    ...row,
    centroid: toWgs84(row.centroid, sourceCoordinateSystem),
    boundary: convertBoundary(row.boundary, sourceCoordinateSystem),
  };
}

export function normalizeFactoryCoordinates(
  row: FactoryImportRow,
  sourceCoordinateSystem: SourceCoordinateSystem,
): {
  row: FactoryImportRow;
  locationGcj02: { lng: number; lat: number } | null;
} {
  const [lng, lat] = row.location;
  return {
    row: {
      ...row,
      location: toWgs84(row.location, sourceCoordinateSystem),
    },
    locationGcj02: sourceCoordinateSystem === "gcj02" ? { lng, lat } : null,
  };
}

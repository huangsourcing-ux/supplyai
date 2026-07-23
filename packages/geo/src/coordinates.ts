export type Wgs84Position = [longitude: number, latitude: number];
export type Gcj02Position = [longitude: number, latitude: number];
export type Bd09Position = [longitude: number, latitude: number];

export const WGS84_COORDINATE_ORDER = ["longitude", "latitude"] as const;

export function isWgs84Position(value: unknown): value is Wgs84Position {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }

  const [longitude, latitude] = value;

  return (
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}

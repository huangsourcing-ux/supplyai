import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

export type Wgs84Point = readonly [lng: number, lat: number];

function readPointFromEwkb(value: string): Wgs84Point {
  const normalized = value.startsWith("\\x") ? value.slice(2) : value;
  const bytes = Buffer.from(normalized, "hex");
  const littleEndian = bytes.readUInt8(0) === 1;
  const readUInt32 = littleEndian
    ? bytes.readUInt32LE.bind(bytes)
    : bytes.readUInt32BE.bind(bytes);
  const readDouble = littleEndian
    ? bytes.readDoubleLE.bind(bytes)
    : bytes.readDoubleBE.bind(bytes);
  const geometryType = readUInt32(1);
  const hasSrid = (geometryType & 0x2000_0000) !== 0;
  const baseType = geometryType & 0x0000_00ff;

  if (baseType !== 1) {
    throw new Error("Expected a PostGIS Point EWKB value");
  }

  const coordinateOffset = hasSrid ? 9 : 5;
  return [readDouble(coordinateOffset), readDouble(coordinateOffset + 8)];
}

export const point4326 = customType<{
  data: Wgs84Point;
  driverData: string;
}>({
  dataType() {
    return "geometry(Point,4326)";
  },
  fromDriver(value) {
    return readPointFromEwkb(value);
  },
  toDriver(value) {
    const [lng, lat] = value;
    return sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
  },
});

/**
 * Boundaries are selected through PostGIS SQL (normally ST_AsGeoJSON) rather
 * than decoded by the ORM. Writes accept PostGIS EWKT.
 */
export const multiPolygon4326 = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geometry(MultiPolygon,4326)";
  },
});

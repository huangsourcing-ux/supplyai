import type {
  Bd09Position,
  Gcj02Position,
  Wgs84Position,
} from "./coordinates.js";

type ReadonlyPosition = readonly [longitude: number, latitude: number];

const PI = Math.PI;
const EARTH_RADIUS_METERS = 6_378_137;
const ECCENTRICITY_SQUARED = 0.006693421622965943;
const BD09_FACTOR = (PI * 3_000) / 180;

const CHINA_BOUNDS = {
  minimumLongitude: 72.004,
  maximumLongitude: 137.8347,
  minimumLatitude: 0.8293,
  maximumLatitude: 55.8271,
} as const;

const GCJ02_INVERSE_MAX_ITERATIONS = 30;
const GCJ02_INVERSE_CONVERGENCE_DEGREES = 1e-7;

function isOutsideChina([longitude, latitude]: ReadonlyPosition): boolean {
  return (
    longitude < CHINA_BOUNDS.minimumLongitude ||
    longitude > CHINA_BOUNDS.maximumLongitude ||
    latitude < CHINA_BOUNDS.minimumLatitude ||
    latitude > CHINA_BOUNDS.maximumLatitude
  );
}

function calculateGcj02Offset(
  longitude: number,
  latitude: number,
): Gcj02Position {
  const longitudeOffset = longitude - 105;
  const latitudeOffset = latitude - 35;
  const product = longitudeOffset * latitudeOffset;
  const longitudeRoot = Math.sqrt(Math.abs(longitudeOffset));

  const sharedWave =
    20 * Math.sin(6 * longitudeOffset * PI) +
    20 * Math.sin(2 * longitudeOffset * PI);

  let latitudeDelta =
    sharedWave +
    20 * Math.sin(latitudeOffset * PI) +
    40 * Math.sin((latitudeOffset * PI) / 3) +
    160 * Math.sin((latitudeOffset * PI) / 12) +
    320 * Math.sin((latitudeOffset * PI) / 30);

  let longitudeDelta =
    sharedWave +
    20 * Math.sin(longitudeOffset * PI) +
    40 * Math.sin((longitudeOffset * PI) / 3) +
    150 * Math.sin((longitudeOffset * PI) / 12) +
    300 * Math.sin((longitudeOffset * PI) / 30);

  latitudeDelta =
    (latitudeDelta * 2) / 3 -
    100 +
    2 * longitudeOffset +
    3 * latitudeOffset +
    0.2 * latitudeOffset * latitudeOffset +
    0.1 * product +
    0.2 * longitudeRoot;

  longitudeDelta =
    (longitudeDelta * 2) / 3 +
    300 +
    longitudeOffset +
    2 * latitudeOffset +
    0.1 * longitudeOffset * longitudeOffset +
    0.1 * product +
    0.1 * longitudeRoot;

  const latitudeRadians = (latitude / 180) * PI;
  const latitudeSine = Math.sin(latitudeRadians);
  const magic = 1 - ECCENTRICITY_SQUARED * latitudeSine * latitudeSine;
  const squareRootMagic = Math.sqrt(magic);

  const adjustedLatitude =
    (latitudeDelta * 180) /
    (((EARTH_RADIUS_METERS * (1 - ECCENTRICITY_SQUARED)) /
      (magic * squareRootMagic)) *
      PI);

  const adjustedLongitude =
    (longitudeDelta * 180) /
    ((EARTH_RADIUS_METERS / squareRootMagic) * Math.cos(latitudeRadians) * PI);

  return [adjustedLongitude, adjustedLatitude];
}

export function wgs84ToGcj02(position: Readonly<Wgs84Position>): Gcj02Position {
  const [longitude, latitude] = position;

  if (isOutsideChina(position)) {
    return [longitude, latitude];
  }

  const [longitudeDelta, latitudeDelta] = calculateGcj02Offset(
    longitude,
    latitude,
  );

  return [longitude + longitudeDelta, latitude + latitudeDelta];
}

export function gcj02ToWgs84(position: Readonly<Gcj02Position>): Wgs84Position {
  const [gcj02Longitude, gcj02Latitude] = position;

  if (isOutsideChina(position)) {
    return [gcj02Longitude, gcj02Latitude];
  }

  let longitude = gcj02Longitude;
  let latitude = gcj02Latitude;

  for (
    let iteration = 0;
    iteration < GCJ02_INVERSE_MAX_ITERATIONS;
    iteration += 1
  ) {
    const [longitudeDelta, latitudeDelta] = calculateGcj02Offset(
      longitude,
      latitude,
    );
    const nextLongitude = gcj02Longitude - longitudeDelta;
    const nextLatitude = gcj02Latitude - latitudeDelta;
    const adjustment = Math.max(
      Math.abs(nextLongitude - longitude),
      Math.abs(nextLatitude - latitude),
    );

    longitude = nextLongitude;
    latitude = nextLatitude;

    if (adjustment < GCJ02_INVERSE_CONVERGENCE_DEGREES) {
      break;
    }
  }

  return [longitude, latitude];
}

export function gcj02ToBd09(position: Readonly<Gcj02Position>): Bd09Position {
  const [longitude, latitude] = position;

  if (isOutsideChina(position)) {
    return [longitude, latitude];
  }

  const radius =
    Math.hypot(longitude, latitude) +
    0.00002 * Math.sin(latitude * BD09_FACTOR);
  const angle =
    Math.atan2(latitude, longitude) +
    0.000003 * Math.cos(longitude * BD09_FACTOR);

  return [radius * Math.cos(angle) + 0.0065, radius * Math.sin(angle) + 0.006];
}

export function bd09ToGcj02(position: Readonly<Bd09Position>): Gcj02Position {
  const [longitude, latitude] = position;

  if (isOutsideChina(position)) {
    return [longitude, latitude];
  }

  const shiftedLongitude = longitude - 0.0065;
  const shiftedLatitude = latitude - 0.006;
  const radius =
    Math.hypot(shiftedLongitude, shiftedLatitude) -
    0.00002 * Math.sin(shiftedLatitude * BD09_FACTOR);
  const angle =
    Math.atan2(shiftedLatitude, shiftedLongitude) -
    0.000003 * Math.cos(shiftedLongitude * BD09_FACTOR);

  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

export function wgs84ToBd09(position: Readonly<Wgs84Position>): Bd09Position {
  return gcj02ToBd09(wgs84ToGcj02(position));
}

export function bd09ToWgs84(position: Readonly<Bd09Position>): Wgs84Position {
  return gcj02ToWgs84(bd09ToGcj02(position));
}

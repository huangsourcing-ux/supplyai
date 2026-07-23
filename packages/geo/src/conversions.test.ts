import { describe, expect, it } from "vitest";

import {
  bd09ToGcj02,
  bd09ToWgs84,
  gcj02ToBd09,
  gcj02ToWgs84,
  wgs84ToBd09,
  wgs84ToGcj02,
} from "./index.js";
import type { Bd09Position, Gcj02Position, Wgs84Position } from "./index.js";

const EARTH_RADIUS_METERS = 6_378_137;
const MAX_FIXTURE_ERROR_METERS = 0.5;

// Public fixtures:
// https://github.com/googollee/eviltransform/blob/master/javascript/test.js
const WGS84_GCJ02_FIXTURES = [
  {
    city: "Shanghai",
    wgs84: [121.5272106, 31.1774276],
    gcj02: [121.531541859215, 31.17530398364597],
  },
  {
    city: "Shenzhen",
    wgs84: [113.912316, 22.543847],
    gcj02: [113.9171774808363, 22.540796131694766],
  },
  {
    city: "Beijing",
    wgs84: [116.377817, 39.911954],
    gcj02: [116.38404722455657, 39.91334545536069],
  },
] as const;

// Public fixture:
// https://github.com/wandergis/coordtransform/blob/master/test/app.js
const GCJ02_BD09_FIXTURE = {
  gcj02: [116.404, 39.915],
  bd09: [116.41036949371029, 39.92133699351021],
} as const;

function distanceInMeters(
  [longitudeA, latitudeA]: readonly [number, number],
  [longitudeB, latitudeB]: readonly [number, number],
): number {
  const degreesToRadians = Math.PI / 180;
  const latitudeARadians = latitudeA * degreesToRadians;
  const latitudeBRadians = latitudeB * degreesToRadians;
  const latitudeDelta = (latitudeB - latitudeA) * degreesToRadians;
  const longitudeDelta = (longitudeB - longitudeA) * degreesToRadians;

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeARadians) *
      Math.cos(latitudeBRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

describe("WGS-84 and GCJ-02 conversion", () => {
  for (const fixture of WGS84_GCJ02_FIXTURES) {
    it(`converts the ${fixture.city} public fixture within ${MAX_FIXTURE_ERROR_METERS}m`, () => {
      const convertedGcj02 = wgs84ToGcj02(fixture.wgs84);
      const convertedWgs84 = gcj02ToWgs84(fixture.gcj02);

      expect(
        distanceInMeters(convertedGcj02, fixture.gcj02),
      ).toBeLessThanOrEqual(MAX_FIXTURE_ERROR_METERS);
      expect(
        distanceInMeters(convertedWgs84, fixture.wgs84),
      ).toBeLessThanOrEqual(MAX_FIXTURE_ERROR_METERS);
    });
  }

  it("keeps a WGS-84 round trip within the fixture threshold", () => {
    for (const fixture of WGS84_GCJ02_FIXTURES) {
      const roundTrip = gcj02ToWgs84(wgs84ToGcj02(fixture.wgs84));

      expect(distanceInMeters(roundTrip, fixture.wgs84)).toBeLessThanOrEqual(
        MAX_FIXTURE_ERROR_METERS,
      );
    }
  });
});

describe("GCJ-02 and BD-09 conversion", () => {
  it(`converts the public fixture in both directions within ${MAX_FIXTURE_ERROR_METERS}m`, () => {
    const convertedBd09 = gcj02ToBd09(GCJ02_BD09_FIXTURE.gcj02);
    const convertedGcj02 = bd09ToGcj02(GCJ02_BD09_FIXTURE.bd09);

    expect(
      distanceInMeters(convertedBd09, GCJ02_BD09_FIXTURE.bd09),
    ).toBeLessThanOrEqual(MAX_FIXTURE_ERROR_METERS);
    expect(
      distanceInMeters(convertedGcj02, GCJ02_BD09_FIXTURE.gcj02),
    ).toBeLessThanOrEqual(MAX_FIXTURE_ERROR_METERS);
  });
});

describe("composed WGS-84 and BD-09 conversion", () => {
  it("uses GCJ-02 as the single intermediate conversion", () => {
    const fixture = WGS84_GCJ02_FIXTURES[0];

    expect(wgs84ToBd09(fixture.wgs84)).toEqual(
      gcj02ToBd09(wgs84ToGcj02(fixture.wgs84)),
    );

    const bd09 = gcj02ToBd09(fixture.gcj02);

    expect(bd09ToWgs84(bd09)).toEqual(gcj02ToWgs84(bd09ToGcj02(bd09)));
  });

  it("keeps a WGS-84 to BD-09 round trip within the fixture threshold", () => {
    for (const fixture of WGS84_GCJ02_FIXTURES) {
      const roundTrip = bd09ToWgs84(wgs84ToBd09(fixture.wgs84));

      expect(distanceInMeters(roundTrip, fixture.wgs84)).toBeLessThanOrEqual(
        MAX_FIXTURE_ERROR_METERS,
      );
    }
  });
});

describe("conversion invariants", () => {
  it("preserves [longitude, latitude] order without mutating inputs", () => {
    const wgs84: Wgs84Position = [116.377817, 39.911954];
    const gcj02: Gcj02Position = [116.38404722455657, 39.91334545536069];
    const bd09: Bd09Position = [116.41036949371029, 39.92133699351021];
    const originalWgs84 = [...wgs84];
    const originalGcj02 = [...gcj02];
    const originalBd09 = [...bd09];

    const convertedGcj02 = wgs84ToGcj02(wgs84);
    const convertedBd09 = gcj02ToBd09(gcj02);
    const convertedWgs84 = bd09ToWgs84(bd09);

    expect(wgs84).toEqual(originalWgs84);
    expect(gcj02).toEqual(originalGcj02);
    expect(bd09).toEqual(originalBd09);
    expect(convertedGcj02).not.toBe(wgs84);
    expect(convertedBd09).not.toBe(gcj02);
    expect(convertedWgs84).not.toBe(bd09);
    expect(convertedGcj02[0]).toBeGreaterThan(convertedGcj02[1]);
    expect(convertedBd09[0]).toBeGreaterThan(convertedBd09[1]);
  });

  it("returns new unchanged tuples outside China for all six conversions", () => {
    const wgs84: Wgs84Position = [-74.006, 40.7128];
    const gcj02: Gcj02Position = [-74.006, 40.7128];
    const bd09: Bd09Position = [-74.006, 40.7128];

    const results = [
      [wgs84ToGcj02(wgs84), wgs84],
      [gcj02ToWgs84(gcj02), gcj02],
      [gcj02ToBd09(gcj02), gcj02],
      [bd09ToGcj02(bd09), bd09],
      [wgs84ToBd09(wgs84), wgs84],
      [bd09ToWgs84(bd09), bd09],
    ] as const;

    for (const [result, input] of results) {
      expect(result).toEqual(input);
      expect(result).not.toBe(input);
    }
  });
});

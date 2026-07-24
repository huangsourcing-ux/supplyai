import { describe, expect, it } from "vitest";

import {
  MAP_BOUNDARY_COARSE_TOLERANCE,
  MAP_BOUNDARY_MEDIUM_TOLERANCE,
  MAP_FACTORY_LIMIT,
  getMapBoundaryTolerance,
  truncateMapFactoryRows,
} from "../src/map/map.service.js";

describe("map service helpers", () => {
  it.each([
    [0, MAP_BOUNDARY_COARSE_TOLERANCE],
    [9, MAP_BOUNDARY_COARSE_TOLERANCE],
    [10, MAP_BOUNDARY_MEDIUM_TOLERANCE],
    [11, MAP_BOUNDARY_MEDIUM_TOLERANCE],
    [12, null],
    [24, null],
  ])(
    "uses the frozen simplification tolerance at zoom %i",
    (zoom, expected) => {
      expect(getMapBoundaryTolerance(zoom)).toBe(expected);
    },
  );

  it("returns at most 5000 rows and reports whether another row exists", () => {
    const exact = Array.from(
      { length: MAP_FACTORY_LIMIT },
      (_, index) => index,
    );
    const over = [...exact, MAP_FACTORY_LIMIT];

    expect(truncateMapFactoryRows(exact)).toEqual({
      rows: exact,
      truncated: false,
    });
    expect(truncateMapFactoryRows(over)).toEqual({
      rows: exact,
      truncated: true,
    });
  });
});

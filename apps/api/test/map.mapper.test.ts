import type { GeoJsonMultiPolygon } from "@chinasupply/schemas";
import { describe, expect, it } from "vitest";

import {
  toMapClusterBoundaryFeature,
  toMapClusterPointFeature,
  toMapFactoryPointFeature,
} from "../src/map/map.mapper.js";

const clusterRow = {
  color: "#112233",
  factoryCount: 7,
  id: "aaaaaaaaaaaaaaaaaaaaa",
  name: { en: "Lighting Cluster", zh: "照明产业带" },
  primaryCategoryId: "bbbbbbbbbbbbbbbbbbbbb",
  slug: "lighting-cluster",
};

describe("map feature mappers", () => {
  it("maps cluster points to the frozen lightweight properties", () => {
    expect(
      toMapClusterPointFeature({
        ...clusterRow,
        centroid: [120.2, 30.3],
      }),
    ).toEqual({
      geometry: { coordinates: [120.2, 30.3], type: "Point" },
      properties: {
        color: "#112233",
        factoryCount: 7,
        id: "aaaaaaaaaaaaaaaaaaaaa",
        name_en: "Lighting Cluster",
        primaryCategoryId: "bbbbbbbbbbbbbbbbbbbbb",
        slug: "lighting-cluster",
      },
      type: "Feature",
    });
  });

  it("maps cluster boundaries without adding public detail fields", () => {
    const boundary = {
      coordinates: [
        [
          [
            [120, 30],
            [121, 30],
            [121, 31],
            [120, 30],
          ],
        ],
      ],
      type: "MultiPolygon" as const,
    } satisfies GeoJsonMultiPolygon;

    expect(toMapClusterBoundaryFeature({ ...clusterRow, boundary })).toEqual({
      geometry: boundary,
      properties: expect.not.objectContaining({
        coverImageUrl: expect.anything(),
        mainProducts: expect.anything(),
      }),
      type: "Feature",
    });
  });

  it("maps factory points and preserves a null public cluster reference", () => {
    expect(
      toMapFactoryPointFeature({
        clusterId: null,
        id: "ccccccccccccccccccccc",
        location: [120.3, 30.4],
        name: { en: "Lighting Factory", zh: "照明工厂" },
        slug: "lighting-factory",
        verified: true,
      }),
    ).toEqual({
      geometry: { coordinates: [120.3, 30.4], type: "Point" },
      properties: {
        clusterId: null,
        id: "ccccccccccccccccccccc",
        name_en: "Lighting Factory",
        slug: "lighting-factory",
        verified: true,
      },
      type: "Feature",
    });
  });
});

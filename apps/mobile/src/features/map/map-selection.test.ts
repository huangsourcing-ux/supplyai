import {
  parseClusterSelection,
  parseFactorySelection,
  resolveMapPressTarget,
} from "./map-selection";

const clusterFeature = {
  geometry: {
    coordinates: [120.075, 29.306],
    type: "Point",
  },
  properties: {
    color: "#0F766E",
    factoryCount: 12,
    id: "clu_12345678901234567",
    name_en: "Yiwu Small Commodities",
    primaryCategoryId: "cat_12345678901234567",
    slug: "yiwu-small-commodities",
  },
};

const factoryFeature = {
  geometry: {
    coordinates: [120.08, 29.31],
    type: "Point",
  },
  properties: {
    clusterId: "clu_12345678901234567",
    id: "fac_12345678901234567",
    name_en: "Yiwu Bright Goods Factory",
    slug: "yiwu-bright-goods",
    verified: true,
  },
};

const factoryClusterFeature = {
  geometry: {
    coordinates: [120.08, 29.31],
    type: "Point",
  },
  properties: {
    cluster_id: 73,
    point_count: 8,
  },
};

describe("mobile map selection", () => {
  it("parses the frozen MAP-1 and MAP-3 properties", () => {
    expect(parseClusterSelection(clusterFeature)).toEqual({
      factoryCount: 12,
      id: "clu_12345678901234567",
      kind: "cluster",
      name: "Yiwu Small Commodities",
      slug: "yiwu-small-commodities",
    });
    expect(parseFactorySelection(factoryFeature)).toEqual({
      clusterId: "clu_12345678901234567",
      id: "fac_12345678901234567",
      kind: "factory",
      name: "Yiwu Bright Goods Factory",
      slug: "yiwu-bright-goods",
      verified: true,
    });
  });

  it("rejects malformed identities, detail properties, and cluster coordinates", () => {
    expect(
      parseClusterSelection({
        properties: { ...clusterFeature.properties, factoryCount: -1 },
      }),
    ).toBeNull();
    expect(
      parseFactorySelection({
        properties: { ...factoryFeature.properties, slug: "Invalid Slug" },
      }),
    ).toBeNull();
    expect(
      resolveMapPressTarget([
        {
          ...factoryClusterFeature,
          geometry: { coordinates: [181, 29.31], type: "Point" },
        },
      ]),
    ).toEqual({ kind: "empty" });
  });

  it("resolves factory clusters before factories and industrial clusters", () => {
    expect(
      resolveMapPressTarget([
        clusterFeature,
        factoryFeature,
        factoryClusterFeature,
      ]),
    ).toEqual({
      clusterId: 73,
      coordinates: [120.08, 29.31],
      kind: "factory-cluster",
    });

    expect(resolveMapPressTarget([clusterFeature, factoryFeature])).toEqual({
      kind: "selection",
      selection: expect.objectContaining({
        id: "fac_12345678901234567",
        kind: "factory",
      }),
    });
    expect(resolveMapPressTarget([clusterFeature])).toEqual({
      kind: "selection",
      selection: expect.objectContaining({
        id: "clu_12345678901234567",
        kind: "cluster",
      }),
    });
    expect(resolveMapPressTarget([])).toEqual({ kind: "empty" });
  });
});

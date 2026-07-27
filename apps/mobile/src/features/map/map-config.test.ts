import { BASEMAP_LABEL_ANCHOR_LAYER_ID } from "@chinasupply/config/map/style";

import {
  CHINA_BOUNDS,
  CLUSTER_BOUNDARIES_FILL_LAYER_ID,
  CLUSTER_BOUNDARIES_LINE_LAYER_ID,
  CLUSTER_POINTS_LAYER_ID,
  FACTORY_CLUSTER_COUNT_LAYER_ID,
  FACTORY_CLUSTERS_LAYER_ID,
  FACTORY_POINTS_LAYER_ID,
  clusterBoundariesFillLayer,
  clusterBoundariesLineLayer,
  clusterPointsLayer,
  factoryClusterCountLayer,
  factoryClustersLayer,
  factoryPointsLayer,
  factorySourceOptions,
} from "./map-config";
import {
  CLUSTER_BOUNDARY_MIN_ZOOM,
  FACTORY_POINT_MIN_ZOOM,
} from "./map-viewport";

describe("mobile industrial map layers", () => {
  it("starts at the approved China bounds", () => {
    expect(CHINA_BOUNDS).toEqual([73, 18, 135, 54]);
  });

  it("places the boundary fill below labels and its line above the basemap", () => {
    expect(clusterBoundariesFillLayer).toMatchObject({
      beforeId: BASEMAP_LABEL_ANCHOR_LAYER_ID,
      id: CLUSTER_BOUNDARIES_FILL_LAYER_ID,
      minzoom: CLUSTER_BOUNDARY_MIN_ZOOM,
      type: "fill",
    });
    expect(clusterBoundariesLineLayer).toMatchObject({
      id: CLUSTER_BOUNDARIES_LINE_LAYER_ID,
      minzoom: CLUSTER_BOUNDARY_MIN_ZOOM,
      type: "line",
    });
    expect(clusterBoundariesLineLayer).not.toHaveProperty("beforeId");
  });

  it("colors MAP-1 points from the category color property", () => {
    expect(clusterPointsLayer).toMatchObject({
      id: CLUSTER_POINTS_LAYER_ID,
      paint: {
        "circle-color": ["coalesce", ["get", "color"], "#0F766E"],
      },
      type: "circle",
    });
  });

  it("clusters MAP-3 factories with the Web parity settings and layers", () => {
    expect(factorySourceOptions).toEqual({
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    expect(factoryClustersLayer).toMatchObject({
      filter: ["has", "point_count"],
      id: FACTORY_CLUSTERS_LAYER_ID,
      minzoom: FACTORY_POINT_MIN_ZOOM,
      type: "circle",
    });
    expect(factoryClusterCountLayer).toMatchObject({
      filter: ["has", "point_count"],
      id: FACTORY_CLUSTER_COUNT_LAYER_ID,
      minzoom: FACTORY_POINT_MIN_ZOOM,
      type: "symbol",
    });
    expect(factoryPointsLayer).toMatchObject({
      filter: ["!", ["has", "point_count"]],
      id: FACTORY_POINTS_LAYER_ID,
      minzoom: FACTORY_POINT_MIN_ZOOM,
      type: "circle",
    });
  });
});

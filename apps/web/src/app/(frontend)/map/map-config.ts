import type { CircleLayerSpecification, LngLatBoundsLike } from "maplibre-gl";

import type { GetMapClusterPoints200Data } from "@chinasupply/api-client";

export const CHINA_BOUNDS: LngLatBoundsLike = [
  [73, 18],
  [135, 54],
];

export const CLUSTER_POINTS_SOURCE_ID = "industrial-cluster-points";
export const CLUSTER_POINTS_LAYER_ID = "industrial-cluster-points-circles";

export const EMPTY_CLUSTER_POINTS: GetMapClusterPoints200Data = {
  features: [],
  type: "FeatureCollection",
};

export const clusterPointsLayer: CircleLayerSpecification = {
  id: CLUSTER_POINTS_LAYER_ID,
  paint: {
    "circle-color": ["coalesce", ["get", "color"], "#0F766E"],
    "circle-opacity": 0.94,
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      3,
      6,
      8,
      8.5,
      12,
      10,
    ],
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-opacity": 0.94,
    "circle-stroke-width": 2,
  },
  source: CLUSTER_POINTS_SOURCE_ID,
  type: "circle",
};

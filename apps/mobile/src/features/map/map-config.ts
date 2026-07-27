import type { LayerProps } from "@maplibre/maplibre-react-native";

import type {
  GetMapClusterBoundaries200Data,
  GetMapClusterPoints200Data,
  GetMapFactories200Data,
} from "@chinasupply/api-client";
import { BASEMAP_LABEL_ANCHOR_LAYER_ID } from "@chinasupply/config/map/style";

import {
  CLUSTER_BOUNDARY_MIN_ZOOM,
  FACTORY_POINT_MIN_ZOOM,
} from "./map-viewport";

export const CHINA_BOUNDS = [73, 18, 135, 54] as const;

export const CLUSTER_POINTS_SOURCE_ID = "industrial-cluster-points";
export const CLUSTER_POINTS_LAYER_ID = "industrial-cluster-points-circles";
export const CLUSTER_BOUNDARIES_SOURCE_ID = "industrial-cluster-boundaries";
export const CLUSTER_BOUNDARIES_FILL_LAYER_ID =
  "industrial-cluster-boundaries-fill";
export const CLUSTER_BOUNDARIES_LINE_LAYER_ID =
  "industrial-cluster-boundaries-line";
export const FACTORIES_SOURCE_ID = "industrial-factories";
export const FACTORY_POINTS_LAYER_ID = "industrial-factory-points";

export const EMPTY_CLUSTER_POINTS: GetMapClusterPoints200Data = {
  features: [],
  type: "FeatureCollection",
};

export const EMPTY_CLUSTER_BOUNDARIES: GetMapClusterBoundaries200Data = {
  features: [],
  type: "FeatureCollection",
};

export const EMPTY_FACTORY_POINTS: GetMapFactories200Data = {
  features: [],
  type: "FeatureCollection",
};

export const clusterBoundariesFillLayer: LayerProps = {
  beforeId: BASEMAP_LABEL_ANCHOR_LAYER_ID,
  id: CLUSTER_BOUNDARIES_FILL_LAYER_ID,
  minzoom: CLUSTER_BOUNDARY_MIN_ZOOM,
  paint: {
    "fill-color": ["coalesce", ["get", "color"], "#0F766E"],
    "fill-opacity": 0.24,
  },
  type: "fill",
};

export const clusterBoundariesLineLayer: LayerProps = {
  id: CLUSTER_BOUNDARIES_LINE_LAYER_ID,
  minzoom: CLUSTER_BOUNDARY_MIN_ZOOM,
  paint: {
    "line-color": ["coalesce", ["get", "color"], "#0F766E"],
    "line-opacity": 0.88,
    "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.25, 14, 2.25],
  },
  type: "line",
};

export const clusterPointsLayer: LayerProps = {
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
  type: "circle",
};

export const factoryPointsLayer: LayerProps = {
  id: FACTORY_POINTS_LAYER_ID,
  minzoom: FACTORY_POINT_MIN_ZOOM,
  paint: {
    "circle-color": [
      "case",
      ["boolean", ["get", "verified"], false],
      "#2563EB",
      "#64748B",
    ],
    "circle-opacity": 0.96,
    "circle-radius": 6,
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 2,
  },
  type: "circle",
};

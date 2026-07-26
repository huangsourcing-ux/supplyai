import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  LngLatBoundsLike,
  SymbolLayerSpecification,
} from "maplibre-gl";

import type {
  GetMapClusterBoundaries200Data,
  GetMapClusterPoints200Data,
  GetMapFactories200Data,
} from "@chinasupply/api-client";

import {
  CLUSTER_BOUNDARY_MIN_ZOOM,
  FACTORY_POINT_MIN_ZOOM,
} from "./map-viewport";

export const CHINA_BOUNDS: LngLatBoundsLike = [
  [73, 18],
  [135, 54],
];

export const CLUSTER_POINTS_SOURCE_ID = "industrial-cluster-points";
export const CLUSTER_POINTS_LAYER_ID = "industrial-cluster-points-circles";
export const CLUSTER_BOUNDARIES_SOURCE_ID = "industrial-cluster-boundaries";
export const CLUSTER_BOUNDARIES_FILL_LAYER_ID =
  "industrial-cluster-boundaries-fill";
export const CLUSTER_BOUNDARIES_LINE_LAYER_ID =
  "industrial-cluster-boundaries-line";
export const FACTORIES_SOURCE_ID = "industrial-factories";
export const FACTORY_CLUSTERS_LAYER_ID = "industrial-factory-clusters";
export const FACTORY_CLUSTER_COUNT_LAYER_ID =
  "industrial-factory-cluster-count";
export const FACTORY_POINTS_LAYER_ID = "industrial-factory-points";
export const MAPLIBRE_WORKER_URL = "/vendor/maplibre-gl/maplibre-gl-worker.mjs";

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

export const factorySourceOptions = {
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50,
} as const;

export const clusterBoundariesFillLayer: FillLayerSpecification = {
  id: CLUSTER_BOUNDARIES_FILL_LAYER_ID,
  minzoom: CLUSTER_BOUNDARY_MIN_ZOOM,
  paint: {
    "fill-color": ["coalesce", ["get", "color"], "#0F766E"],
    "fill-opacity": 0.24,
  },
  source: CLUSTER_BOUNDARIES_SOURCE_ID,
  type: "fill",
};

export const clusterBoundariesLineLayer: LineLayerSpecification = {
  id: CLUSTER_BOUNDARIES_LINE_LAYER_ID,
  minzoom: CLUSTER_BOUNDARY_MIN_ZOOM,
  paint: {
    "line-color": ["coalesce", ["get", "color"], "#0F766E"],
    "line-opacity": 0.88,
    "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.25, 14, 2.25],
  },
  source: CLUSTER_BOUNDARIES_SOURCE_ID,
  type: "line",
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

export const factoryClustersLayer: CircleLayerSpecification = {
  filter: ["has", "point_count"],
  id: FACTORY_CLUSTERS_LAYER_ID,
  minzoom: FACTORY_POINT_MIN_ZOOM,
  paint: {
    "circle-color": "#F97316",
    "circle-opacity": 0.94,
    "circle-radius": [
      "step",
      ["get", "point_count"],
      17,
      10,
      22,
      100,
      28,
      1000,
      34,
    ],
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 2.5,
  },
  source: FACTORIES_SOURCE_ID,
  type: "circle",
};

export const factoryClusterCountLayer: SymbolLayerSpecification = {
  filter: ["has", "point_count"],
  id: FACTORY_CLUSTER_COUNT_LAYER_ID,
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["Noto Sans Regular"],
    "text-size": 12,
  },
  minzoom: FACTORY_POINT_MIN_ZOOM,
  paint: {
    "text-color": "#FFFFFF",
  },
  source: FACTORIES_SOURCE_ID,
  type: "symbol",
};

export const factoryPointsLayer: CircleLayerSpecification = {
  filter: ["!", ["has", "point_count"]],
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
  source: FACTORIES_SOURCE_ID,
  type: "circle",
};

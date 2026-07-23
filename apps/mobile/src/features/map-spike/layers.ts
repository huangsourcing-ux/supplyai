import type {
  CircleLayerSpecification,
  FillLayerSpecification,
} from "@maplibre/maplibre-react-native";

export const polygonLayer: Omit<FillLayerSpecification, "source"> = {
  id: "validation-polygon",
  type: "fill",
  paint: {
    "fill-color": "#0F766E",
    "fill-opacity": 0.28,
    "fill-outline-color": "#115E59",
  },
};

export const referencePointLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "reference-point",
  type: "circle",
  paint: {
    "circle-color": "#2563EB",
    "circle-radius": 9,
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 3,
  },
};

export const clusterLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "clustered-points",
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#F97316",
    "circle-opacity": 0.92,
    "circle-radius": ["step", ["get", "point_count"], 17, 5, 22, 10, 28],
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 3,
  },
};

export const unclusteredPointLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "unclustered-points",
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#2563EB",
    "circle-radius": 7,
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 2,
  },
};

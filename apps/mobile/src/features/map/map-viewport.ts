import type { ViewStateChangeEvent } from "@maplibre/maplibre-react-native";

export const MAP_VIEWPORT_DEBOUNCE_MS = 500;
export const CLUSTER_BOUNDARY_MIN_ZOOM = 8;
export const FACTORY_POINT_MIN_ZOOM = 10;

export interface MapViewport {
  bbox: string;
  zoom: number;
}

export interface DebouncedViewportUpdater {
  cancel: () => void;
  schedule: (viewport: MapViewport) => void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function readMapViewport(
  viewState: Pick<ViewStateChangeEvent, "bounds" | "zoom">,
): MapViewport | null {
  const [rawWest, rawSouth, rawEast, rawNorth] = viewState.bounds;
  const values = [rawWest, rawSouth, rawEast, rawNorth, viewState.zoom];

  if (values.some((value) => !Number.isFinite(value))) return null;

  const west = roundCoordinate(clamp(rawWest, -180, 180));
  const south = roundCoordinate(clamp(rawSouth, -90, 90));
  const east = roundCoordinate(clamp(rawEast, -180, 180));
  const north = roundCoordinate(clamp(rawNorth, -90, 90));

  if (west >= east || south >= north) return null;

  return {
    bbox: [west, south, east, north].join(","),
    zoom: clamp(Math.floor(viewState.zoom), 0, 24),
  };
}

export function createDebouncedViewportUpdater(
  update: (viewport: MapViewport) => void,
  delay = MAP_VIEWPORT_DEBOUNCE_MS,
): DebouncedViewportUpdater {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    cancel: () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
    schedule: (viewport) => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        update(viewport);
      }, delay);
    },
  };
}

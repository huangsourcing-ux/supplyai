import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLUSTER_BOUNDARIES_SOURCE_ID,
  clusterBoundariesFillLayer,
  FACTORIES_SOURCE_ID,
  factoryClusterCountLayer,
  factoryClustersLayer,
  factoryPointsLayer,
  factorySourceOptions,
} from "../app/(frontend)/map/map-config";
import { MapTruncationNotice } from "../app/(frontend)/map/map-truncation-notice";
import {
  CLUSTER_BOUNDARY_MIN_ZOOM,
  createDebouncedViewportUpdater,
  FACTORY_POINT_MIN_ZOOM,
  MAP_VIEWPORT_DEBOUNCE_MS,
  readMapViewport,
} from "../app/(frontend)/map/map-viewport";

afterEach(() => {
  vi.useRealTimers();
});

describe("Web map layered loading", () => {
  it("normalizes viewport bounds and floors zoom for MAP query params", () => {
    const viewport = readMapViewport({
      getBounds: () => ({
        getEast: () => 181.25,
        getNorth: () => 91,
        getSouth: () => -91,
        getWest: () => -181.25,
      }),
      getZoom: () => 10.875,
    });

    expect(viewport).toEqual({
      bbox: "-180,-90,180,90",
      zoom: 10,
    });
  });

  it("rejects non-finite and degenerate viewports", () => {
    expect(
      readMapViewport({
        getBounds: () => ({
          getEast: () => 120,
          getNorth: () => 30,
          getSouth: () => 30,
          getWest: () => 119,
        }),
        getZoom: () => 8,
      }),
    ).toBeNull();

    expect(
      readMapViewport({
        getBounds: () => ({
          getEast: () => Number.NaN,
          getNorth: () => 31,
          getSouth: () => 29,
          getWest: () => 119,
        }),
        getZoom: () => 8,
      }),
    ).toBeNull();
  });

  it("debounces viewport updates for 500ms and keeps only the latest value", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    const updater = createDebouncedViewportUpdater(update);

    updater.schedule({ bbox: "119,29,120,30", zoom: 8 });
    vi.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS - 1);
    updater.schedule({ bbox: "120,30,121,31", zoom: 10 });
    vi.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS - 1);
    expect(update).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      bbox: "120,30,121,31",
      zoom: 10,
    });
  });

  it("cancels a pending debounced viewport update", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    const updater = createDebouncedViewportUpdater(update);

    updater.schedule({ bbox: "119,29,120,30", zoom: 8 });
    updater.cancel();
    vi.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS);

    expect(update).not.toHaveBeenCalled();
  });

  it("uses the approved zoom thresholds and category colors for boundaries", () => {
    expect(CLUSTER_BOUNDARY_MIN_ZOOM).toBe(8);
    expect(FACTORY_POINT_MIN_ZOOM).toBe(10);
    expect(clusterBoundariesFillLayer.source).toBe(
      CLUSTER_BOUNDARIES_SOURCE_ID,
    );
    expect(clusterBoundariesFillLayer.minzoom).toBe(8);
    expect(clusterBoundariesFillLayer.paint?.["fill-color"]).toEqual([
      "coalesce",
      ["get", "color"],
      "#0F766E",
    ]);
    expect(clusterBoundariesFillLayer.paint?.["fill-opacity"]).toBeLessThan(
      0.5,
    );
  });

  it("configures clustered factories, counts, and individual points at zoom 10", () => {
    expect(factorySourceOptions).toEqual({
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    expect(factoryClustersLayer.source).toBe(FACTORIES_SOURCE_ID);
    expect(factoryClustersLayer.minzoom).toBe(10);
    expect(factoryClustersLayer.filter).toEqual(["has", "point_count"]);
    expect(factoryClusterCountLayer.filter).toEqual(["has", "point_count"]);
    expect(factoryClusterCountLayer.layout?.["text-field"]).toEqual([
      "get",
      "point_count_abbreviated",
    ]);
    expect(factoryPointsLayer.filter).toEqual(["!", ["has", "point_count"]]);
    expect(factoryPointsLayer.minzoom).toBe(10);
  });

  it("renders the truncated response as a polite localized status", () => {
    const markup = renderToStaticMarkup(
      <MapTruncationNotice message="Zoom in to see all factories" />,
    );

    expect(markup).toContain("Zoom in to see all factories");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('data-state="truncated"');
  });
});

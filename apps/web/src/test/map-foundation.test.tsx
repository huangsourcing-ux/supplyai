import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import type { GetMapClusterPoints200Data } from "@chinasupply/api-client";

import {
  CHINA_BOUNDS,
  CLUSTER_POINTS_SOURCE_ID,
  clusterPointsLayer,
  MAPLIBRE_WORKER_URL,
} from "../app/(frontend)/map/map-config";
import { MapAttribution } from "../app/(frontend)/map/map-attribution";
import { MapStatus } from "../app/(frontend)/map/map-status";

const labels = {
  attributionLabel: "Map data attribution",
  dataError: "Map data could not be loaded.",
  loading: "Loading industrial clusters…",
  mapError: "The map could not be loaded.",
  mapTilerLogoAlt: "MapTiler logo",
  retry: "Retry",
  truncated: "Zoom in to see all factories",
};

describe("Web map foundation", () => {
  it("uses the self-hosted MapLibre module worker", () => {
    expect(MAPLIBRE_WORKER_URL).toBe(
      "/vendor/maplibre-gl/maplibre-gl-worker.mjs",
    );
  });

  it("starts from the approved China bounds and colors MAP-1 points by property", () => {
    expect(CHINA_BOUNDS).toEqual([
      [73, 18],
      [135, 54],
    ]);
    expect(clusterPointsLayer.source).toBe(CLUSTER_POINTS_SOURCE_ID);
    expect(clusterPointsLayer.type).toBe("circle");
    expect(clusterPointsLayer.paint?.["circle-color"]).toEqual([
      "coalesce",
      ["get", "color"],
      "#0F766E",
    ]);
  });

  it("keeps MAP-1 coordinates in WGS-84 longitude-latitude order", () => {
    const mapData: GetMapClusterPoints200Data = {
      features: [
        {
          geometry: {
            coordinates: [120.075, 29.306],
            type: "Point",
          },
          properties: {
            color: "#0F766E",
            factoryCount: 12,
            id: "cluster_yiwu_000001",
            name_en: "Yiwu Small Commodities Cluster",
            primaryCategoryId: "category_goods_00001",
            slug: "yiwu-small-commodities",
          },
          type: "Feature",
        },
      ],
      type: "FeatureCollection",
    };

    expect(mapData.features[0]?.geometry.coordinates).toEqual([
      120.075, 29.306,
    ]);
  });

  it("renders required attribution and the Free-plan logo immediately", () => {
    const markup = renderToStaticMarkup(<MapAttribution labels={labels} />);

    expect(markup).toContain("https://www.maptiler.com/copyright/");
    expect(markup).toContain("https://www.openstreetmap.org/copyright");
    expect(markup).toContain("© MapTiler");
    expect(markup).toContain("© OpenStreetMap contributors");
    expect(markup).toContain("https://api.maptiler.com/resources/logo.svg");
    expect(markup).toContain('alt="MapTiler logo"');
    expect(markup).toContain('aria-label="Map data attribution"');
  });

  it.each([
    ["map-error", labels.mapError],
    ["data-error", labels.dataError],
  ] as const)(
    "renders the %s retry state with English i18n",
    (kind, message) => {
      const markup = renderToStaticMarkup(
        <MapStatus kind={kind} labels={labels} onRetry={vi.fn()} />,
      );

      expect(markup).toContain(`data-state="${kind}"`);
      expect(markup).toContain(message);
      expect(markup).toContain(labels.retry);
      expect(markup).toContain('role="alert"');
    },
  );

  it("renders a polite localized loading state without a retry action", () => {
    const markup = renderToStaticMarkup(
      <MapStatus kind="loading" labels={labels} onRetry={vi.fn()} />,
    );

    expect(markup).toContain(labels.loading);
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain(labels.retry);
  });
});

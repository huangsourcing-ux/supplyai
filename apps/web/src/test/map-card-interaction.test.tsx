import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  type MapSelectionCardLabels,
  MapSelectionCardView,
} from "../app/(frontend)/map/map-selection-card";
import {
  parseClusterSelection,
  parseFactorySelection,
  resolveMapClickTarget,
  type SelectedMapFeature,
} from "../app/(frontend)/map/map-selection";

vi.mock("next/image", async () => {
  const react = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({
      alt,
      src,
    }: Readonly<{
      alt: string;
      src: string;
    }>) => react.createElement("img", { alt, src }),
  };
});

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

const clusterSelection: SelectedMapFeature = {
  factoryCount: 12,
  id: "clu_12345678901234567",
  kind: "cluster",
  name: "Yiwu Small Commodities",
  slug: "yiwu-small-commodities",
};

const factorySelection: SelectedMapFeature = {
  clusterId: "clu_12345678901234567",
  id: "fac_12345678901234567",
  kind: "factory",
  name: "Yiwu Bright Goods Factory",
  slug: "yiwu-bright-goods",
  verified: true,
};

function labels(
  overrides: Partial<MapSelectionCardLabels> = {},
): MapSelectionCardLabels {
  return {
    close: "Close details",
    detailError: "Details could not be loaded.",
    entityType: "Industrial cluster",
    factoryCountOrVerification: "12 factories",
    loadingDetails: "Loading details",
    mainProducts: "Main products",
    retry: "Retry",
    viewDetails: "View cluster details",
    ...overrides,
  };
}

describe("Web map card interaction", () => {
  it("parses the fixed MAP properties into discriminated selections", () => {
    expect(parseClusterSelection(clusterFeature)).toEqual(clusterSelection);
    expect(parseFactorySelection(factoryFeature)).toEqual(factorySelection);
  });

  it("rejects malformed identities and detail-triggering properties", () => {
    expect(
      parseClusterSelection({
        properties: {
          ...clusterFeature.properties,
          factoryCount: -1,
        },
      }),
    ).toBeNull();
    expect(
      parseFactorySelection({
        properties: {
          ...factoryFeature.properties,
          slug: "Invalid Slug",
        },
      }),
    ).toBeNull();
  });

  it("resolves overlapping rendered features in the approved priority order", () => {
    expect(
      resolveMapClickTarget({
        clusterBoundary: clusterFeature,
        clusterPoint: clusterFeature,
        factoryCluster: factoryClusterFeature,
        factoryPoint: factoryFeature,
      }),
    ).toEqual({
      clusterId: 73,
      coordinates: [120.08, 29.31],
      kind: "factory-cluster",
    });

    expect(
      resolveMapClickTarget({
        clusterBoundary: clusterFeature,
        clusterPoint: clusterFeature,
        factoryPoint: factoryFeature,
      }),
    ).toEqual({
      kind: "selection",
      selection: factorySelection,
    });

    expect(
      resolveMapClickTarget({
        clusterBoundary: clusterFeature,
      }),
    ).toEqual({
      kind: "selection",
      selection: clusterSelection,
    });
    expect(resolveMapClickTarget({})).toEqual({ kind: "empty" });
  });

  it("renders MAP-1 identity immediately with a localized skeleton and link", () => {
    const markup = renderToStaticMarkup(
      <MapSelectionCardView
        detail={{ status: "loading" }}
        labels={labels()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
        selection={clusterSelection}
      />,
    );

    expect(markup).toContain("Yiwu Small Commodities");
    expect(markup).toContain("12 factories");
    expect(markup).toContain('data-state="loading"');
    expect(markup).toContain('aria-label="Loading details"');
    expect(markup).toContain('href="/clusters/yiwu-small-commodities"');
    expect(markup).toContain('aria-label="Close details"');
  });

  it("supplements a factory card with A-5 image and main products", () => {
    const markup = renderToStaticMarkup(
      <MapSelectionCardView
        detail={{
          imageUrl: "https://media.example.test/factories/bright/cover.webp",
          mainProducts: ["LED gifts", "Promotional goods"],
          status: "ready",
        }}
        labels={labels({
          entityType: "Factory",
          factoryCountOrVerification: "Verified",
          viewDetails: "View factory details",
        })}
        onClose={vi.fn()}
        onRetry={vi.fn()}
        selection={factorySelection}
      />,
    );

    expect(markup).toContain("Verified");
    expect(markup).toContain("LED gifts");
    expect(markup).toContain("Promotional goods");
    expect(markup).toContain(
      "https://media.example.test/factories/bright/cover.webp",
    );
    expect(markup).toContain('href="/factories/yiwu-bright-goods"');
    expect(markup).toContain('data-verified="true"');
  });

  it("keeps immediate MAP properties visible when A-2 detail loading fails", () => {
    const markup = renderToStaticMarkup(
      <MapSelectionCardView
        detail={{ status: "error" }}
        labels={labels()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
        selection={clusterSelection}
      />,
    );

    expect(markup).toContain("Yiwu Small Commodities");
    expect(markup).toContain("12 factories");
    expect(markup).toContain("Details could not be loaded.");
    expect(markup).toContain("Retry");
    expect(markup).toContain('role="alert"');
  });

  it("renders an unverified factory with a neutral no-image fallback", () => {
    const markup = renderToStaticMarkup(
      <MapSelectionCardView
        detail={{
          imageUrl: null,
          mainProducts: ["Small appliances"],
          status: "ready",
        }}
        labels={labels({
          entityType: "Factory",
          factoryCountOrVerification: "Unverified",
          viewDetails: "View factory details",
        })}
        onClose={vi.fn()}
        onRetry={vi.fn()}
        selection={{
          ...factorySelection,
          verified: false,
        }}
      />,
    );

    expect(markup).toContain("Unverified");
    expect(markup).toContain("Small appliances");
    expect(markup).toContain('data-state="ready"');
    expect(markup).toContain('data-verified="false"');
    expect(markup).not.toContain("<img");
  });
});

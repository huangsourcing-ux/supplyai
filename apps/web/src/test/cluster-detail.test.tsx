import { existsSync } from "node:fs";

import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  GetCluster200,
  GetCluster200Data,
  GetClusterFactories200,
  GetClusterFactories200DataItem,
} from "@chinasupply/api-client";

vi.mock(
  "../app/(frontend)/clusters/[slug]/cluster-factory-list",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../app/(frontend)/clusters/[slug]/cluster-factory-list")
      >();

    return {
      ...actual,
      ClusterFactoryList: ({
        initialPage,
      }: {
        initialPage: GetClusterFactories200;
      }) => <div data-testid="factory-list">{initialPage.data.length}</div>,
    };
  },
);

vi.mock("../app/(frontend)/clusters/[slug]/cluster-view-tracker", () => ({
  ClusterViewTracker: () => null,
}));

import {
  ClusterBoundaryMap,
  getClusterBoundaryBounds,
} from "../app/(frontend)/clusters/[slug]/cluster-boundary-map";
import { ClusterDetailContent } from "../app/(frontend)/clusters/[slug]/cluster-detail-content";
import { isMissingClusterResponse } from "../app/(frontend)/clusters/[slug]/cluster-errors";
import {
  flattenFactoryPages,
  getNextFactoryCursor,
} from "../app/(frontend)/clusters/[slug]/cluster-factory-list";
import { buildClusterMetadata } from "../app/(frontend)/clusters/[slug]/cluster-metadata";
import {
  formatClusterFactoryCount,
  formatClusterStats,
} from "../app/(frontend)/clusters/[slug]/cluster-stats";

const cluster: GetCluster200Data = {
  boundary: {
    coordinates: [
      [
        [
          [113, 22],
          [114, 22],
          [114, 23],
          [113, 23],
          [113, 22],
        ],
      ],
    ],
    type: "MultiPolygon",
  },
  categories: [],
  centroid: { coordinates: [113.5, 22.5], type: "Point" },
  coverImageUrl: "https://cdn.example.com/cluster.jpg",
  description:
    "Trusted suppliers.\n\n<script>alert('unsafe')</script>\n\n**Export ready.**",
  factoryCount: 12_345,
  id: "cluster_fixture_00001",
  mainProducts: ["LED lighting", "Smart controls"],
  name: "Shenzhen Lighting Cluster",
  primaryCategory: {
    color: "#0F766E",
    icon: null,
    id: "category_fixture_0001",
    name: "Lighting",
    parentId: null,
    slug: "lighting",
    sortOrder: 1,
  },
  publishedAt: "2026-07-25T12:00:00Z",
  region: {
    id: "region_fixture_000001",
    level: "city",
    name: "Shenzhen",
  },
  slug: "shenzhen-lighting",
  stats: {
    annualOutputUsd: 1_250_000_000,
    exportShare: 0.625,
    note: "Published estimate",
  },
  summary: "A major export-oriented lighting supply base.",
};

const factory: GetClusterFactories200DataItem = {
  cluster: {
    id: cluster.id,
    name: cluster.name,
    slug: cluster.slug,
  },
  id: "factory_fixture_00001",
  imageUrl: null,
  location: { coordinates: [113.51, 22.51], type: "Point" },
  mainProducts: ["LED bulbs"],
  name: "Fixture Lighting Factory",
  publishedAt: "2026-07-25T12:00:00Z",
  region: cluster.region,
  slug: "fixture-lighting-factory",
  verified: true,
};

const clusterResponse: GetCluster200 = {
  data: cluster,
  error: null,
  meta: {},
};

const factoriesResponse: GetClusterFactories200 = {
  data: [factory],
  error: null,
  meta: { nextCursor: "opaque-page-2" },
};

const labels = {
  aboutHeading: "About this industrial cluster",
  annualOutput: "Annual output",
  backToMap: "Back to the map",
  descriptionImageAlt: "Shenzhen Lighting Cluster industrial cluster",
  exportShare: "Export share",
  factoriesHeading: "Factories in this cluster",
  factoryCount: "Factories",
  location: "Shenzhen, China",
  productsHeading: "Main products",
  save: "Save cluster",
  saveUnavailable: "Favorites unavailable.",
  statsHeading: "Cluster at a glance",
};

const mapMessages = {
  ClusterDetail: {
    map: {
      ariaLabel: "Map preview of {name}",
      attributionLabel: "Map data attribution",
      boundaryUnavailable: "Boundary unavailable",
      error: "Map error",
      loading: "Loading map",
      mapTilerLogoAlt: "MapTiler logo",
      retry: "Retry",
    },
  },
};

function renderClusterContent(
  response: GetCluster200,
  factories: GetClusterFactories200,
) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={mapMessages} timeZone="UTC">
      <ClusterDetailContent
        clusterResponse={response}
        factoriesResponse={factories}
        formattedFactoryCount={formatClusterFactoryCount(
          response.data.factoryCount,
          "en",
        )}
        formattedStats={formatClusterStats(response.data.stats, "en")}
        labels={labels}
      />
    </NextIntlClientProvider>,
  );
}

describe("cluster detail presentation", () => {
  it("renders complete SSR content, formats stats, and strips raw Markdown HTML", () => {
    const markup = renderClusterContent(clusterResponse, factoriesResponse);

    expect(markup).toContain(cluster.name);
    expect(markup).toContain("12,345");
    expect(markup).toContain("$1.3B");
    expect(markup).toContain("62.5%");
    expect(markup).toContain("<strong>Export ready.</strong>");
    expect(markup).not.toContain("<script");
    expect(markup).not.toContain("alert(&#x27;unsafe&#x27;)");
    expect(markup).toContain("Favorites unavailable.");
  });

  it("omits empty optional sections while always rendering factoryCount", () => {
    const emptyCluster = {
      ...cluster,
      boundary: null,
      coverImageUrl: null,
      description: null,
      factoryCount: 0,
      stats: null,
    };
    const markup = renderClusterContent(
      { ...clusterResponse, data: emptyCluster },
      { ...factoriesResponse, data: [] },
    );

    expect(markup).toContain(">0<");
    expect(markup).toContain('data-boundary="centroid"');
    expect(markup).not.toContain(labels.aboutHeading);
    expect(markup).not.toContain(labels.annualOutput);
    expect(markup).not.toContain(labels.exportShare);
  });
});

describe("cluster metadata", () => {
  it("emits canonical, English hreflang, summary, and cover OG image", () => {
    const metadata = buildClusterMetadata(cluster, {
      imageAlt: "Cluster cover",
      title: "Cluster title",
    });

    expect(metadata.alternates).toEqual({
      canonical: "/clusters/shenzhen-lighting",
      languages: { en: "/clusters/shenzhen-lighting" },
    });
    expect(metadata.description).toBe(cluster.summary);
    expect(metadata.openGraph).toMatchObject({
      description: cluster.summary,
      images: [
        {
          alt: "Cluster cover",
          url: cluster.coverImageUrl,
        },
      ],
      title: "Cluster title",
      url: "/clusters/shenzhen-lighting",
    });
  });

  it("does not emit an OG image without a cover", () => {
    const metadata = buildClusterMetadata(
      { ...cluster, coverImageUrl: null },
      { imageAlt: "unused", title: "Cluster title" },
    );

    expect(metadata.openGraph).not.toHaveProperty("images");
  });
});

describe("cluster map and pagination helpers", () => {
  it("calculates boundary bounds and retains centroid fallback attribution", () => {
    expect(getClusterBoundaryBounds(cluster.boundary)).toEqual([
      [113, 22],
      [114, 23],
    ]);
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={mapMessages} timeZone="UTC">
        <ClusterBoundaryMap
          boundary={null}
          centroid={cluster.centroid}
          color="#0F766E"
          name={cluster.name}
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain('data-boundary="centroid"');
    expect(markup).toContain("Boundary unavailable");
    expect(markup).toContain("© OpenStreetMap contributors");
    expect(markup).toContain("© MapTiler");
  });

  it("passes opaque cursors unchanged and de-duplicates pages", () => {
    const secondFactory = {
      ...factory,
      id: "factory_fixture_00002",
      slug: "second-fixture-factory",
    };
    const pages = [
      factoriesResponse,
      {
        data: [factory, secondFactory],
        error: null,
        meta: { nextCursor: null },
      },
    ] satisfies GetClusterFactories200[];

    expect(getNextFactoryCursor(factoriesResponse)).toBe("opaque-page-2");
    expect(getNextFactoryCursor(pages[1]!)).toBeUndefined();
    expect(flattenFactoryPages(pages).map(({ id }) => id)).toEqual([
      factory.id,
      secondFactory.id,
    ]);
  });
});

describe("cluster request failure classification", () => {
  it("maps invalid or unpublished slugs to not-found and rethrows outages", () => {
    expect(isMissingClusterResponse({ status: 400 })).toBe(true);
    expect(isMissingClusterResponse({ status: 404 })).toBe(true);
    expect(isMissingClusterResponse({ status: 500 })).toBe(false);
    expect(isMissingClusterResponse(new Error("offline"))).toBe(false);
  });

  it("keeps the not-found decision outside a route-level streaming boundary", () => {
    expect(
      existsSync(
        new URL(
          "../app/(frontend)/clusters/[slug]/loading.tsx",
          import.meta.url,
        ),
      ),
    ).toBe(false);
  });
});

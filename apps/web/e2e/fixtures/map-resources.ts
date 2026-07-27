import type { BrowserContext } from "@playwright/test";

import planetV4SchemaManifest from "../../../../packages/config/test/fixtures/planet-v4-schema-manifest.json" with { type: "json" };

const EMPTY_VECTOR_TILE = Buffer.from([]);
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const MAPTILER_HOST = "api.maptiler.com";
const FIXTURE_TILE_HOST = "tiles.fixture.invalid";
const FIXTURE_API_HOST = "api.fixture.invalid";
const FIXTURE_CLERK_HOST = "clerk.fixture.invalid";
const FIXTURE_POSTHOG_HOST = "posthog.fixture.invalid";
const FIXTURE_WEB_ORIGIN = "http://127.0.0.1:3100";

const tileJson = {
  bounds: [-180, -85.0511, 180, 85.0511],
  center: [104, 36, 3],
  format: "pbf",
  maxzoom: 15,
  minzoom: 0,
  name: "ChinaSupply.AI Playwright fixture tiles",
  scheme: "xyz",
  tilejson: "2.0.0",
  tiles: ["https://tiles.fixture.invalid/{z}/{x}/{y}.pbf"],
  vector_layers: planetV4SchemaManifest.vector_layers.map(({ id }) => ({
    fields: {},
    id,
    maxzoom: 15,
    minzoom: 0,
  })),
};

const spriteNames = [
  "aerialway",
  "airport",
  "bus_stop",
  "crossing",
  "dot",
  "ferry_terminal",
  "oneway",
  "subway",
  "subway_entrance",
  "traffic_signal",
  "tram_stop",
  "transit",
  ...Array.from({ length: 12 }, (_, index) => `road_${index + 1}`),
];

const spriteIndex = Object.fromEntries(
  spriteNames.map((name) => [
    name,
    {
      content: [0, 0, 1, 1],
      height: 1,
      pixelRatio: 1,
      stretchX: [[0, 1]],
      stretchY: [[0, 1]],
      width: 1,
      x: 0,
      y: 0,
    },
  ]),
);

const logoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="68" height="21" viewBox="0 0 68 21">
    <rect width="68" height="21" rx="3" fill="#0f766e" />
    <text x="34" y="14" fill="white" font-family="sans-serif" font-size="9" text-anchor="middle">MapTiler</text>
  </svg>
`;

export interface FixedMapResources {
  assertNoUnexpectedExternalRequests: () => void;
  glyphRequests: string[];
  postHogRequests: Array<{
    method: string;
    postData: string | null;
    url: string;
  }>;
  resourceRequests: Array<{
    kind: "glyph" | "tile";
    sequence: number;
    url: string;
  }>;
  tileRequests: string[];
}

export async function installFixedMapResources(
  context: BrowserContext,
): Promise<FixedMapResources> {
  const unexpectedExternalRequests: string[] = [];
  const glyphRequests: string[] = [];
  const postHogRequests: FixedMapResources["postHogRequests"] = [];
  const resourceRequests: FixedMapResources["resourceRequests"] = [];
  const tileRequests: string[] = [];
  let requestSequence = 0;

  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());

    if (
      url.protocol === "blob:" ||
      url.protocol === "data:" ||
      url.origin === FIXTURE_WEB_ORIGIN
    ) {
      await route.fallback();
      return;
    }

    if (url.hostname === FIXTURE_API_HOST) {
      await route.fallback();
      return;
    }

    if (url.hostname === FIXTURE_CLERK_HOST) {
      await route.abort("blockedbyclient");
      return;
    }

    if (url.hostname === FIXTURE_POSTHOG_HOST) {
      postHogRequests.push({
        method: route.request().method(),
        postData: route.request().postData(),
        url: url.href,
      });
      await route.fulfill({
        body: JSON.stringify({ status: 1 }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (url.hostname === FIXTURE_TILE_HOST) {
      tileRequests.push(url.href);
      resourceRequests.push({
        kind: "tile",
        sequence: requestSequence,
        url: url.href,
      });
      requestSequence += 1;
      await route.fulfill({
        body: EMPTY_VECTOR_TILE,
        contentType: "application/x-protobuf",
        status: 200,
      });
      return;
    }

    if (url.hostname === MAPTILER_HOST && url.pathname.endsWith("tiles.json")) {
      await route.fulfill({
        body: JSON.stringify(tileJson),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (url.hostname === MAPTILER_HOST && url.pathname.startsWith("/fonts/")) {
      const safeUrl = `${url.origin}${url.pathname}`;
      glyphRequests.push(safeUrl);
      resourceRequests.push({
        kind: "glyph",
        sequence: requestSequence,
        url: safeUrl,
      });
      requestSequence += 1;
      await route.fulfill({
        body: EMPTY_VECTOR_TILE,
        contentType: "application/x-protobuf",
        status: 200,
      });
      return;
    }

    if (
      url.hostname === MAPTILER_HOST &&
      url.pathname.startsWith("/sprites/")
    ) {
      if (url.pathname.endsWith(".json")) {
        await route.fulfill({
          body: JSON.stringify(spriteIndex),
          contentType: "application/json",
          status: 200,
        });
      } else if (url.pathname.endsWith(".png")) {
        await route.fulfill({
          body: TRANSPARENT_PNG,
          contentType: "image/png",
          status: 200,
        });
      } else {
        unexpectedExternalRequests.push(url.href);
        await route.abort("blockedbyclient");
      }
      return;
    }

    if (
      url.hostname === MAPTILER_HOST &&
      url.pathname === "/resources/logo.svg"
    ) {
      await route.fulfill({
        body: logoSvg,
        contentType: "image/svg+xml",
        status: 200,
      });
      return;
    }

    unexpectedExternalRequests.push(url.href);
    await route.abort("blockedbyclient");
  });

  return {
    assertNoUnexpectedExternalRequests: () => {
      if (unexpectedExternalRequests.length > 0) {
        throw new Error(
          `Unexpected external requests:\n${unexpectedExternalRequests.join("\n")}`,
        );
      }
    },
    glyphRequests,
    postHogRequests,
    resourceRequests,
    tileRequests,
  };
}

import type { BrowserContext } from "@playwright/test";

const EMPTY_VECTOR_TILE = Buffer.from([]);
const MAPTILER_HOST = "api.maptiler.com";
const FIXTURE_TILE_HOST = "tiles.fixture.invalid";
const FIXTURE_API_HOST = "api.fixture.invalid";
const FIXTURE_CLERK_HOST = "clerk.fixture.invalid";
const FIXTURE_WEB_ORIGIN = "http://127.0.0.1:3100";

const tileJson = {
  bounds: [-180, -85.0511, 180, 85.0511],
  center: [104, 36, 3],
  format: "pbf",
  maxzoom: 14,
  minzoom: 0,
  name: "ChinaSupply.AI Playwright fixture tiles",
  scheme: "xyz",
  tilejson: "3.0.0",
  tiles: ["https://tiles.fixture.invalid/{z}/{x}/{y}.pbf"],
  vector_layers: [
    { fields: {}, id: "boundary", maxzoom: 14, minzoom: 0 },
    { fields: {}, id: "landcover", maxzoom: 14, minzoom: 0 },
    { fields: {}, id: "landuse", maxzoom: 14, minzoom: 0 },
    { fields: {}, id: "place", maxzoom: 14, minzoom: 0 },
    { fields: {}, id: "transportation", maxzoom: 14, minzoom: 0 },
    { fields: {}, id: "water", maxzoom: 14, minzoom: 0 },
  ],
};

const logoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="68" height="21" viewBox="0 0 68 21">
    <rect width="68" height="21" rx="3" fill="#0f766e" />
    <text x="34" y="14" fill="white" font-family="sans-serif" font-size="9" text-anchor="middle">MapTiler</text>
  </svg>
`;

export interface FixedMapResources {
  assertNoUnexpectedExternalRequests: () => void;
  tileRequests: string[];
}

export async function installFixedMapResources(
  context: BrowserContext,
): Promise<FixedMapResources> {
  const unexpectedExternalRequests: string[] = [];
  const tileRequests: string[] = [];

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

    if (url.hostname === FIXTURE_TILE_HOST) {
      tileRequests.push(url.href);
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
      await route.fulfill({
        body: EMPTY_VECTOR_TILE,
        contentType: "application/x-protobuf",
        status: 200,
      });
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
    tileRequests,
  };
}

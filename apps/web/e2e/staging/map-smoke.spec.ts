import { expect, test, type Response } from "@playwright/test";

const SEARCH_LABEL = "Search products, industrial clusters, and factories";
const SPRITE_IDS = ["transportation", "general", "misc"] as const;

test("loads Planet v4 resources and captures China, cluster, and factory map scenes", async ({
  page,
}, testInfo) => {
  const maptilerResourceBodies: Promise<{
    bodySize: number;
    kind: string;
    status: number;
  }>[] = [];
  const captureMapTilerBody = (response: Response) => {
    const url = new URL(response.url());
    if (url.hostname !== "api.maptiler.com") return;

    const kind = url.pathname.includes("/tiles/v4/tiles.json")
      ? "tilejson"
      : url.pathname.includes("/tiles/v4/") && url.pathname.endsWith(".pbf")
        ? "vector"
        : url.pathname.startsWith("/fonts/")
          ? "glyph"
          : url.pathname.startsWith("/sprites/")
            ? "sprite"
            : "other";
    maptilerResourceBodies.push(
      response
        .body()
        .then((body) => ({
          bodySize: body.byteLength,
          kind,
          status: response.status(),
        }))
        .catch(() => ({ bodySize: 0, kind, status: response.status() })),
    );
  };
  page.on("response", captureMapTilerBody);

  const mapOneResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/map/clusters/points") &&
      response.status() === 200,
  );
  const tileJsonResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/tiles/v4/tiles.json" &&
      response.status() === 200,
  );
  const vectorTileResponse = page.waitForResponse(
    (response) =>
      response.url().includes("maptiler.com") &&
      response.url().includes("/tiles/v4/") &&
      response.url().includes(".pbf") &&
      response.status() === 200,
  );
  const glyphResponse = page.waitForResponse(
    (response) =>
      response.url().includes("api.maptiler.com/fonts/") &&
      response.url().includes(".pbf") &&
      response.status() === 200,
  );
  const spriteResponses = SPRITE_IDS.flatMap((spriteId) =>
    (["json", "png"] as const).map((extension) =>
      page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.hostname === "api.maptiler.com" &&
          url.pathname.includes(`/sprites/${spriteId}/`) &&
          url.pathname.endsWith(`.${extension}`) &&
          response.status() === 200
        );
      }),
    ),
  );

  await page.goto("/");
  const maptilerResponses = await Promise.all([
    tileJsonResponse,
    vectorTileResponse,
    glyphResponse,
    ...spriteResponses,
  ]);
  await mapOneResponse;
  await testInfo.attach("planet-v4-resource-smoke.json", {
    body: Buffer.from(
      JSON.stringify(
        maptilerResponses.map((response) => ({
          status: response.status(),
          url: response.url().replace(/([?&]key=)[^&]+/u, "$1<redacted>"),
        })),
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });

  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => canvas.evaluate((element) => element.clientWidth))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => canvas.evaluate((element) => element.clientHeight))
    .toBeGreaterThan(0);
  const attribution = page.getByRole("complementary", {
    name: "Map data attribution",
  });
  await expect(attribution).toContainText("© MapTiler");
  await expect(attribution).toContainText("© OpenStreetMap contributors");
  await testInfo.attach("china-overview.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.waitForTimeout(1_000);
  page.off("response", captureMapTilerBody);
  const resourceBodies = await Promise.all(maptilerResourceBodies);
  await testInfo.attach("maptiler-performance.json", {
    body: Buffer.from(
      JSON.stringify(
        {
          bodySize: resourceBodies.reduce(
            (total, resource) => total + resource.bodySize,
            0,
          ),
          byKind: Object.fromEntries(
            [...new Set(resourceBodies.map(({ kind }) => kind))]
              .sort()
              .map((kind) => {
                const resources = resourceBodies.filter(
                  (resource) => resource.kind === kind,
                );
                return [
                  kind,
                  {
                    bodySize: resources.reduce(
                      (total, resource) => total + resource.bodySize,
                      0,
                    ),
                    requestCount: resources.length,
                    statuses: [
                      ...new Set(resources.map(({ status }) => status)),
                    ].sort(),
                  },
                ];
              }),
          ),
          requestCount: resourceBodies.length,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });

  const search = page.getByRole("combobox", { name: SEARCH_LABEL });
  await search.fill("Dongguan");
  await page
    .getByRole("option", { name: /Dongguan Electronic Information/iu })
    .click();
  const clusterCard = page.getByRole("complementary", {
    name: /Industrial cluster: Dongguan/iu,
  });
  await expect(clusterCard).toBeVisible();
  await clusterCard.getByRole("link", { name: "View cluster details" }).click();
  await expect(page).toHaveURL(/\/clusters\/dongguan-electronic-information$/u);
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await testInfo.attach("dongguan-cluster-z10-scene.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await page.goto("/");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  const factorySearch = page.getByRole("combobox", { name: SEARCH_LABEL });
  await factorySearch.fill("Dongguan Amperex");
  await page
    .getByRole("option", { name: /Dongguan Amperex Technology/iu })
    .click();
  const factoryCard = page.getByRole("complementary", {
    name: /Factory: Dongguan Amperex Technology/iu,
  });
  await expect(factoryCard).toBeVisible();
  await factoryCard.getByRole("link", { name: "View factory details" }).click();
  await expect(page).toHaveURL(/\/factories\/dongguan-amperex-technology$/u);
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await testInfo.attach("dongguan-factory-z14-scene.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("starts glyphs early and serves a repeated overview from persistent cache", async ({
  page,
}, testInfo) => {
  const glyphResponses: string[] = [];
  const captureGlyphResponse = (response: Response) => {
    const url = new URL(response.url());
    if (
      url.hostname === "api.maptiler.com" &&
      url.pathname.startsWith("/fonts/")
    ) {
      glyphResponses.push(`${url.origin}${url.pathname}`);
    }
  };
  page.on("response", captureGlyphResponse);

  await page.goto("/");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("Loading industrial clusters…")).toBeHidden();
  await expect.poll(() => glyphResponses.length).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cacheName = (await caches.keys()).find((name) =>
          name.startsWith("chinasupply-map-glyphs-"),
        );
        if (cacheName === undefined) return 0;
        return (await (await caches.open(cacheName)).keys()).length;
      }),
    )
    .toBeGreaterThan(0);

  const coldReadyAt = await page.evaluate(() => performance.now());
  const coldGlyphTimings = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("api.maptiler.com/fonts/"))
      .map((entry) => {
        const resource = entry as PerformanceResourceTiming;
        const url = new URL(entry.name);
        return {
          duration: Math.round(resource.duration),
          responseEnd: Math.round(resource.responseEnd),
          startTime: Math.round(resource.startTime),
          transferSize: resource.transferSize,
          url: `${url.origin}${url.pathname}`,
        };
      }),
  );
  const coldGlyphRequestCount = glyphResponses.length;
  glyphResponses.length = 0;

  await page.reload();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("Loading industrial clusters…")).toBeHidden();
  await page.waitForTimeout(500);
  const warmReadyAt = await page.evaluate(() => performance.now());

  expect(glyphResponses).toHaveLength(0);
  await testInfo.attach("maptiler-glyph-cache-performance.json", {
    body: Buffer.from(
      JSON.stringify(
        {
          cold: {
            glyphRequestCount: coldGlyphRequestCount,
            glyphTimings: coldGlyphTimings,
            readyAt: Math.round(coldReadyAt),
          },
          warm: {
            glyphRequestCount: glyphResponses.length,
            readyAt: Math.round(warmReadyAt),
          },
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
});

import { expect, test } from "@playwright/test";

const SEARCH_LABEL = "Search products, industrial clusters, and factories";

test("loads real staging MAP-1 and MapTiler resources, then opens Dongguan from search", async ({
  page,
}) => {
  const mapOneResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/map/clusters/points") &&
      response.status() === 200,
  );
  const tileJsonResponse = page.waitForResponse(
    (response) =>
      response.url().includes("api.maptiler.com/tiles/") &&
      response.url().includes("tiles.json") &&
      response.status() === 200,
  );
  const vectorTileResponse = page.waitForResponse(
    (response) =>
      response.url().includes("maptiler.com") &&
      response.url().includes("/tiles/") &&
      response.url().includes(".pbf") &&
      response.status() === 200,
  );

  await page.goto("/");
  await Promise.all([mapOneResponse, tileJsonResponse, vectorTileResponse]);

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

  const search = page.getByRole("combobox", { name: SEARCH_LABEL });
  await search.fill("Dongguan");
  await page
    .getByRole("option", { name: /Dongguan Electronic Information/iu })
    .click();
  await expect(
    page.getByRole("complementary", {
      name: /Industrial cluster: Dongguan/iu,
    }),
  ).toBeVisible();
});

import playwrightMsw from "next/experimental/testmode/playwright/msw.js";

import {
  getGetMapClusterPointsMockHandler,
  getGetMapFactoriesMockHandler,
} from "@chinasupply/api-client/mocks";
import type { Page } from "@playwright/test";

import {
  CLUSTER_NAME,
  CLUSTER_SLUG,
  clusterPointsResponse,
  clusterResponse,
  FACTORY_NAME,
  FACTORY_SLUG,
  truncatedFactoryPointsResponse,
} from "../fixtures/data";
import { expect, test } from "./test";

const { delay, HttpResponse, http } =
  playwrightMsw as unknown as typeof import("next/experimental/testmode/playwright/msw.js");

const SEARCH_LABEL = "Search products, industrial clusters, and factories";

async function waitForReadyMap(page: Page) {
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByText("Loading industrial clusters…")).toBeHidden();
  await expect
    .poll(async () => canvas.evaluate((element) => element.clientWidth))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => canvas.evaluate((element) => element.clientHeight))
    .toBeGreaterThan(0);
  return canvas;
}

async function chooseSearchResult(page: Page, name: string) {
  const search = page.getByRole("combobox", { name: SEARCH_LABEL });
  await search.fill("Dongguan");
  await page.getByRole("option", { name: new RegExp(name, "u") }).click();
}

test("loads a deterministic map, opens a MAP-1 point, retries A-2, and enters cluster detail", async ({
  fixedMapResources,
  msw,
  page,
}) => {
  let clusterAttempts = 0;
  msw.use(
    http.get("*/api/v1/clusters/:slug", async () => {
      clusterAttempts += 1;
      if (clusterAttempts === 1) {
        await delay(350);
        return HttpResponse.error();
      }
      return HttpResponse.json(clusterResponse);
    }),
  );

  await page.goto("/");
  const canvas = await waitForReadyMap(page);

  await expect(
    page.getByRole("complementary", { name: "Map data attribution" }),
  ).toContainText("© MapTiler");
  await expect(
    page.getByRole("complementary", { name: "Map data attribution" }),
  ).toContainText("© OpenStreetMap contributors");
  await expect
    .poll(() => fixedMapResources.tileRequests.length)
    .toBeGreaterThan(0);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: {
      x: box!.width / 2,
      y: box!.height * 0.55,
    },
  });

  const card = page.getByRole("complementary", {
    name: `Industrial cluster: ${CLUSTER_NAME}`,
  });
  await expect(card.getByRole("heading", { name: CLUSTER_NAME })).toBeVisible();
  await expect(
    card.getByRole("status", { name: "Loading details" }),
  ).toBeVisible();
  await expect(card.getByRole("alert")).toContainText(
    "Details could not be loaded.",
  );
  await card.getByRole("button", { name: "Retry" }).click();
  await expect(card.getByText("Precision connectors")).toBeVisible();
  expect(clusterAttempts).toBeGreaterThanOrEqual(2);

  await card.getByRole("link", { name: "View cluster details" }).click();
  await expect(page).toHaveURL(new RegExp(`/clusters/${CLUSTER_SLUG}$`, "u"));
  await expect(
    page.getByRole("heading", { level: 1, name: CLUSTER_NAME }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Factories in this cluster" }),
  ).toBeVisible();
  await expect(page.getByText(FACTORY_NAME)).toBeVisible();
});

test("debounces rapid category changes and sends only the final MAP request", async ({
  msw,
  page,
}) => {
  const pointRequests: string[] = [];
  msw.use(
    getGetMapClusterPointsMockHandler(({ request }) => {
      pointRequests.push(request.url);
      return clusterPointsResponse;
    }),
  );

  await page.goto("/");
  await waitForReadyMap(page);
  pointRequests.length = 0;

  await page.getByRole("button", { name: "Electronics" }).click();
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "Furniture" }).click();

  await expect
    .poll(
      () =>
        pointRequests.filter((url) => url.includes("category=furniture"))
          .length,
    )
    .toBe(1);
  expect(
    pointRequests.some((url) => url.includes("category=electronics")),
  ).toBe(false);
});

test("aborts an obsolete MAP request and renders the replacement response", async ({
  msw,
  page,
}) => {
  const pointRequests: string[] = [];
  msw.use(
    getGetMapClusterPointsMockHandler(async ({ request }) => {
      pointRequests.push(request.url);
      if (request.url.includes("category=electronics")) {
        await delay(2_000);
      }
      return clusterPointsResponse;
    }),
  );

  await page.goto("/");
  await waitForReadyMap(page);

  await page.getByRole("button", { name: "Electronics" }).click();
  await expect
    .poll(() =>
      pointRequests.some((url) => url.includes("category=electronics")),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Furniture" }).click();

  await expect
    .poll(() => pointRequests.some((url) => url.includes("category=furniture")))
    .toBe(true);
  await expect
    .poll(async () =>
      page.evaluate(() =>
        window.__mapFetchRecords.some(
          (record) =>
            record.url.includes("category=electronics") &&
            record.abortedAt !== null,
        ),
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Furniture", pressed: true }),
  ).toBeVisible();
});

test("shows truncated state after a factory flyTo and completes the factory detail path", async ({
  msw,
  page,
}) => {
  let factoryRequests = 0;
  msw.use(
    getGetMapFactoriesMockHandler(() => {
      factoryRequests += 1;
      return truncatedFactoryPointsResponse;
    }),
  );

  await page.goto("/");
  await waitForReadyMap(page);
  const factoryMapResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/map/factories"),
  );
  await chooseSearchResult(page, FACTORY_NAME);

  const card = page.getByRole("complementary", {
    name: `Factory: ${FACTORY_NAME}`,
  });
  await expect(card.getByRole("heading", { name: FACTORY_NAME })).toBeVisible();
  await expect(card.getByText("Verified", { exact: true })).toBeVisible();
  await expect(card.getByText("Control boards")).toBeVisible();
  await expect.poll(() => factoryRequests).toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const response = await factoryMapResponse;
      const body = (await response.json()) as {
        meta?: { truncated?: boolean };
      };
      return body.meta?.truncated;
    })
    .toBe(true);
  const factoryFetchRecords = await page.evaluate(() =>
    window.__mapFetchRecords.filter((record) =>
      record.url.includes("/api/v1/map/factories"),
    ),
  );
  expect(factoryFetchRecords).toHaveLength(1);
  expect(factoryFetchRecords[0]?.abortedAt).toBeNull();
  const truncationNotice = page.locator('[data-state="truncated"]');
  await expect(truncationNotice).toHaveText("Zoom in to see all factories");
  await expect(truncationNotice).toBeVisible();
  const [searchBox, noticeBox] = await Promise.all([
    page.locator(".map-search").boundingBox(),
    truncationNotice.boundingBox(),
  ]);
  expect(searchBox).not.toBeNull();
  expect(noticeBox).not.toBeNull();
  expect(noticeBox!.y).toBeGreaterThanOrEqual(searchBox!.y + searchBox!.height);

  await card.getByRole("link", { name: "View factory details" }).click();
  await expect(page).toHaveURL(new RegExp(`/factories/${FACTORY_SLUG}$`, "u"));
  await expect(
    page.getByRole("heading", { level: 1, name: FACTORY_NAME }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Factory information" }),
  ).toBeVisible();
  await expect(
    page.getByText("1 Fixture Road, Dongguan, Guangdong, China"),
  ).toBeVisible();
});

test("searches for a cluster, flies to it, and fills its card from A-2", async ({
  page,
}) => {
  await page.goto("/");
  await waitForReadyMap(page);
  await chooseSearchResult(page, CLUSTER_NAME);

  const card = page.getByRole("complementary", {
    name: `Industrial cluster: ${CLUSTER_NAME}`,
  });
  await expect(card.getByText("5 factories")).toBeVisible();
  await expect(card.getByText("Precision connectors")).toBeVisible();
});

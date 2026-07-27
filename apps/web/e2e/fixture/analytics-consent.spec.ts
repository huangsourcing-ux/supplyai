import { expect, test } from "./test";

const CONSENT_PANEL_TITLE = "Help us improve ChinaSupply.AI";
const SEARCH_LABEL = "Search products, industrial clusters, and factories";

test("keeps PostHog unloaded before consent and after a persisted rejection", async ({
  fixedMapResources,
  page,
}) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: CONSENT_PANEL_TITLE });
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Read the Privacy Policy" }),
  ).toHaveAttribute("href", "/privacy");
  await expect(
    page.getByRole("button", { exact: true, name: "Analytics" }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(fixedMapResources.postHogRequests).toHaveLength(0);

  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("Loading industrial clusters…")).toBeHidden();
  const search = page.getByRole("combobox", { name: SEARCH_LABEL });
  await search.fill("Dongguan");
  await expect(
    page.getByRole("option", { name: /Dongguan Electronics Cluster/u }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(700);
  expect(fixedMapResources.postHogRequests).toHaveLength(0);

  await page.goto("/factories/dongguan-precision-electronics");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Dongguan Precision Electronics",
    }),
  ).toBeVisible();
  await expect(panel).toBeVisible();
  expect(fixedMapResources.postHogRequests).toHaveLength(0);

  await panel.getByRole("button", { name: "Reject analytics" }).click();
  await expect(panel).toBeHidden();
  expect(fixedMapResources.postHogRequests).toHaveLength(0);

  await page.reload();
  await expect(panel).toBeHidden();
  expect(fixedMapResources.postHogRequests).toHaveLength(0);

  await page.getByRole("button", { exact: true, name: "Analytics" }).click();
  await expect(panel).toBeVisible();
  await expect(
    panel.getByText("Analytics are currently disabled."),
  ).toBeVisible();
  await panel.press("Escape");
  await expect(panel).toBeHidden();

  await page.goto("/clusters/dongguan-electronics-cluster");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Dongguan Electronics Cluster",
    }),
  ).toBeVisible();
  expect(fixedMapResources.postHogRequests).toHaveLength(0);
});

test("loads PostHog only after consent and stops capture after withdrawal", async ({
  fixedMapResources,
  page,
}) => {
  await page.goto("/factories/dongguan-precision-electronics");

  const panel = page.getByRole("region", { name: CONSENT_PANEL_TITLE });
  await expect(panel).toBeVisible();
  expect(fixedMapResources.postHogRequests).toHaveLength(0);

  await panel.getByRole("button", { name: "Allow analytics" }).click();
  await expect(panel).toBeHidden();
  await expect
    .poll(() => fixedMapResources.postHogRequests.length)
    .toBeGreaterThan(0);
  const requestCountAfterGrant = fixedMapResources.postHogRequests.length;

  await page.getByRole("button", { exact: true, name: "Analytics" }).click();
  await expect(
    panel.getByText("Anonymous analytics are currently allowed."),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Reject analytics" }).click();
  await expect(panel).toBeHidden();

  await page.goto("/clusters/dongguan-electronics-cluster");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Dongguan Electronics Cluster",
    }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  expect(fixedMapResources.postHogRequests).toHaveLength(
    requestCountAfterGrant,
  );
});

test("keeps analytics choices reachable and usable on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  const panel = page.getByRole("region", { name: CONSENT_PANEL_TITLE });
  const analyticsButton = page.getByRole("button", {
    exact: true,
    name: "Analytics",
  });
  await expect(panel).toBeVisible();
  await expect(analyticsButton).toBeVisible();

  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(390);

  await panel.getByRole("button", { name: "Reject analytics" }).click();
  await analyticsButton.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading")).toBeFocused();
  await panel.getByRole("button", { name: "Close analytics settings" }).click();
  await expect(panel).toBeHidden();
});

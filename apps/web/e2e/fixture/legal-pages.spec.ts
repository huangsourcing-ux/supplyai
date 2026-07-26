import { expect, test } from "./test";

const COMPANY_NUMBER = "17241958";

test("publishes both legal pages with stable public links", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/v1/")) {
      apiRequests.push(request.url());
    }
  });

  const privacyResponse = await page.goto("/privacy");
  expect(privacyResponse?.status()).toBe(200);
  expect(new URL(privacyResponse!.url()).pathname).toBe("/privacy");
  await expect(page).toHaveTitle("Privacy Policy | ChinaSupply.AI");
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
  ).toBeVisible();
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-07-26");
  await expect(page.locator("time")).toHaveText("July 26, 2026");
  const privacyCompany = page.getByRole("complementary", {
    name: "Company and contact details",
  });
  await expect(
    privacyCompany.getByText(`Company No.: ${COMPANY_NUMBER}`),
  ).toBeVisible();
  await expect(
    privacyCompany.getByRole("link", { name: "huang.sourcing@gmail.com" }),
  ).toHaveAttribute("href", "mailto:huang.sourcing@gmail.com");
  await expect(
    page.locator("footer").getByRole("link", {
      name: "Terms of Use",
      exact: true,
    }),
  ).toHaveAttribute("href", "/terms");

  const termsResponse = await page.goto("/terms");
  expect(termsResponse?.status()).toBe(200);
  expect(new URL(termsResponse!.url()).pathname).toBe("/terms");
  await expect(page).toHaveTitle("Terms of Use | ChinaSupply.AI");
  await expect(
    page.getByRole("heading", { level: 1, name: "Terms of Use" }),
  ).toBeVisible();
  await expect(page.getByText("£100", { exact: false })).toBeVisible();
  await expect(
    page.locator("footer").getByRole("link", {
      name: "Privacy Policy",
      exact: true,
    }),
  ).toHaveAttribute("href", "/privacy");
  expect(apiRequests).toEqual([]);
});

test("keeps legal content usable by keyboard at a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/privacy");

  const article = page.locator("article");
  const articleBox = await article.boundingBox();
  expect(articleBox).not.toBeNull();
  expect(articleBox!.x).toBeGreaterThanOrEqual(0);
  expect(articleBox!.x + articleBox!.width).toBeLessThanOrEqual(390);

  const contentsLink = page.getByRole("link", {
    name: "1. Controller and scope",
  });
  await contentsLink.focus();
  await expect(contentsLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/privacy#controller-and-scope$/u);
});

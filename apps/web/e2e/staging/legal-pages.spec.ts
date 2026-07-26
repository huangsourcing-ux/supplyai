import { expect, test } from "@playwright/test";

for (const legalPage of [
  { heading: "Privacy Policy", path: "/privacy" },
  { heading: "Terms of Use", path: "/terms" },
] as const) {
  test(`${legalPage.path} is public on canonical staging`, async ({ page }) => {
    const response = await page.goto(legalPage.path);

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(
      `https://staging.chinasupply.ai${legalPage.path}`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: legalPage.heading }),
    ).toBeVisible();
    const company = page.getByRole("complementary", {
      name: "Company and contact details",
    });
    await expect(company.getByText("HUANG SOURCING LTD")).toBeVisible();
    await expect(company.getByText("17241958", { exact: false })).toBeVisible();
    await expect(page.locator("time")).toHaveAttribute(
      "datetime",
      "2026-07-26",
    );
  });
}

test("staging registration flow links both legal routes", async ({ page }) => {
  const response = await page.goto("/sign-in");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("link", { name: "Terms of Use", exact: true }),
  ).toHaveAttribute("href", "/terms");
  await expect(
    page.getByRole("link", { name: "Privacy Policy", exact: true }),
  ).toHaveAttribute("href", "/privacy");
});

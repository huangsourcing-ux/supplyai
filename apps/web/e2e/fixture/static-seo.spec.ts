import { expect, test } from "./test";

test("publishes the About page with canonical metadata and contact details", async ({
  page,
}) => {
  const response = await page.goto("/about");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("About ChinaSupply.AI");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A clearer way to understand where China makes things",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Email ChinaSupply.AI" }),
  ).toHaveAttribute("href", "mailto:huang.sourcing@gmail.com");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/about",
  );
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/about",
  );
  await expect(
    page.getByRole("link", { name: "About", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.setViewportSize({ height: 844, width: 390 });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A clearer way to understand where China makes things",
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("serves static sitemap fallbacks and keeps local indexing disabled", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("application/xml");
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain("http://127.0.0.1:3100/about");
  expect(sitemapBody).toContain("http://127.0.0.1:3100/guides");
  expect(sitemapBody).toContain("http://127.0.0.1:3100/privacy");
  expect(sitemapBody).toContain("http://127.0.0.1:3100/terms");

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /");
});

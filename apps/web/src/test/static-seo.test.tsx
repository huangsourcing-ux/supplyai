import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    const values: Record<string, string> = {
      "About.contact.companyNumber": "Company No. {number}",
      "Legal.shared.company.address":
        "61 Bridge Street, Kington, United Kingdom, HR5 3DJ",
      "Legal.shared.company.email": "huang.sourcing@gmail.com",
      "Legal.shared.company.name": "HUANG SOURCING LTD",
      "Legal.shared.company.number": "17241958",
      "Legal.shared.company.registration": "Registered in England and Wales",
    };

    return (key: string, valuesInput?: Record<string, string>) => {
      const translated =
        values[`${namespace}.${key}`] ?? `translated:${namespace}.${key}`;
      return valuesInput === undefined
        ? translated
        : translated.replace("{number}", valuesInput.number ?? "");
    };
  }),
}));

import AboutPage, {
  generateMetadata as generateAboutMetadata,
} from "../app/(frontend)/about/page";
import { ListSkeleton } from "../app/(frontend)/list-skeleton";
import { buildPublicPageMetadata } from "../seo/metadata";
import { buildRobots, buildSitemap, collectCursorPages } from "../seo/sitemap";

describe("M5-T7 static pages and SEO", () => {
  it("renders a semantic About page with the operating company contact", async () => {
    const markup = renderToStaticMarkup(await AboutPage());

    expect(markup).toContain("<main");
    expect(markup).toContain("<header");
    expect(markup).toContain("<ol");
    expect(markup).toContain("<aside");
    expect(markup).toContain("<address>");
    expect(markup).toContain("HUANG SOURCING LTD");
    expect(markup).toContain("17241958");
    expect(markup).toContain('href="mailto:huang.sourcing@gmail.com"');
    expect(markup).toContain('href="/guides"');
  });

  it("builds canonical English metadata for public pages", async () => {
    await expect(generateAboutMetadata()).resolves.toMatchObject({
      alternates: {
        canonical: "/about",
        languages: { en: "/about" },
      },
      openGraph: {
        locale: "en_US",
        type: "website",
        url: "/about",
      },
    });

    expect(
      buildPublicPageMetadata({
        description: "Description",
        path: "/guides",
        title: "Guides",
      }),
    ).toMatchObject({
      alternates: {
        canonical: "/guides",
        languages: { en: "/guides" },
      },
      title: "Guides",
    });
  });

  it("paginates every published API record and rejects a repeated cursor", async () => {
    const getPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ slug: "first" }],
        meta: { nextCursor: "cursor-2" },
      })
      .mockResolvedValueOnce({
        data: [{ slug: "second" }],
        meta: { nextCursor: null },
      });

    await expect(collectCursorPages(getPage)).resolves.toEqual([
      { slug: "first" },
      { slug: "second" },
    ]);
    expect(getPage).toHaveBeenNthCalledWith(1, undefined);
    expect(getPage).toHaveBeenNthCalledWith(2, "cursor-2");

    const repeatedCursor = vi.fn().mockResolvedValue({
      data: [],
      meta: { nextCursor: "same-cursor" },
    });
    await expect(collectCursorPages(repeatedCursor)).rejects.toThrow(
      /repeated cursor/,
    );
  });

  it("builds absolute static and published-content sitemap entries", () => {
    const sitemap = buildSitemap("https://www.chinasupply.ai", {
      clusters: [
        {
          publishedAt: "2026-07-30T12:00:00.000Z",
          slug: "dongguan-electronics",
        },
      ],
      factories: [
        {
          publishedAt: "2026-07-30T13:00:00.000Z",
          slug: "fixture-factory",
        },
      ],
      guides: [
        {
          publishedAt: "2026-07-30T14:00:00.000Z",
          slug: "sourcing-guide",
        },
      ],
    });

    expect(sitemap.map(({ url }) => url)).toEqual(
      expect.arrayContaining([
        "https://www.chinasupply.ai/",
        "https://www.chinasupply.ai/about",
        "https://www.chinasupply.ai/privacy",
        "https://www.chinasupply.ai/terms",
        "https://www.chinasupply.ai/clusters/dongguan-electronics",
        "https://www.chinasupply.ai/factories/fixture-factory",
        "https://www.chinasupply.ai/guides/sourcing-guide",
      ]),
    );
    expect(
      sitemap.find(({ url }) => url.endsWith("/clusters/dongguan-electronics")),
    ).toMatchObject({
      alternates: {
        languages: {
          en: "https://www.chinasupply.ai/clusters/dongguan-electronics",
        },
      },
      lastModified: new Date("2026-07-30T12:00:00.000Z"),
    });
  });

  it("blocks non-production indexing and protects private production routes", () => {
    expect(buildRobots("staging", "https://staging.chinasupply.ai")).toEqual({
      rules: {
        disallow: "/",
        userAgent: "*",
      },
    });
    expect(
      buildRobots("production", "https://www.chinasupply.ai"),
    ).toMatchObject({
      host: "https://www.chinasupply.ai",
      rules: {
        allow: "/",
        disallow: expect.arrayContaining(["/account", "/ops", "/sign-in"]),
        userAgent: "*",
      },
      sitemap: "https://www.chinasupply.ai/sitemap.xml",
    });
  });

  it("renders an accessible card or row skeleton without exposing fake content", () => {
    const cards = renderToStaticMarkup(
      <ListSkeleton items={3} label="Loading suppliers" />,
    );
    const rows = renderToStaticMarkup(
      <ListSkeleton items={2} label="Loading records" layout="rows" />,
    );

    expect(cards).toContain('role="status"');
    expect(cards).toContain('aria-label="Loading suppliers"');
    expect(cards.match(/data-layout="cards"/gu)).toHaveLength(1);
    expect(rows).toContain('data-layout="rows"');
    expect(rows).not.toContain("Loading suppliers");
  });
});

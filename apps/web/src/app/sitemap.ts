import type { MetadataRoute } from "next";

import {
  configureApiClient,
  getClusters,
  getFactories,
} from "@chinasupply/api-client";

import { getPublishedGuides } from "./(frontend)/guides/guide-data";
import {
  buildSitemap,
  collectCursorPages,
  type SitemapContentRecord,
} from "../seo/sitemap";

export const dynamic = "force-dynamic";

type RevalidatedRequestInit = RequestInit & {
  next: {
    revalidate: number;
  };
};

const SITEMAP_REVALIDATE_SECONDS = 900;
const revalidatedRequest: RevalidatedRequestInit = {
  cache: "force-cache",
  next: {
    revalidate: SITEMAP_REVALIDATE_SECONDS,
  },
};

async function getPublishedClusters(): Promise<SitemapContentRecord[]> {
  return collectCursorPages(async (cursor) =>
    getClusters(
      {
        ...(cursor === undefined ? {} : { cursor }),
        limit: 100,
      },
      revalidatedRequest,
    ),
  );
}

async function getPublishedFactories(): Promise<SitemapContentRecord[]> {
  return collectCursorPages(async (cursor) =>
    getFactories(
      {
        ...(cursor === undefined ? {} : { cursor }),
        limit: 100,
      },
      revalidatedRequest,
    ),
  );
}

async function getPublishedGuideRecords(): Promise<SitemapContentRecord[]> {
  if (process.env.PLAYWRIGHT_TEST === "1") return [];

  return getPublishedGuides().then((articles) =>
    articles.map(({ publishedAt, slug }) => ({ publishedAt, slug })),
  );
}

async function settledRecords(
  request: Promise<SitemapContentRecord[]>,
): Promise<SitemapContentRecord[]> {
  try {
    return await request;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  configureApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
  });

  const [clusters, factories, guides] = await Promise.all([
    settledRecords(getPublishedClusters()),
    settledRecords(getPublishedFactories()),
    settledRecords(getPublishedGuideRecords()),
  ]);

  return buildSitemap(process.env.NEXT_PUBLIC_SITE_URL!, {
    clusters,
    factories,
    guides,
  });
}

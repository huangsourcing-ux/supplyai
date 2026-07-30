import { getPayload } from "payload";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { buildCmsMediaCdnUrl } from "@/cms/media-storage";
import type { Article, Media } from "@/payload-types";
import config from "@payload-config";

export interface GuideMedia {
  aiGenerated: boolean;
  alt: string;
  height: number;
  url: string;
  width: number;
}

export interface GuideSummary {
  cover: GuideMedia;
  id: number;
  publishedAt: string;
  slug: string;
  title: string;
}

export interface GuideDetail extends GuideSummary {
  body: Article["body"];
}

export const GUIDES_REVALIDATE_SECONDS = 900;

function resolvedMedia(cover: Article["cover"]): Media | null {
  return typeof cover === "object" && cover !== null ? cover : null;
}

function toSummary(article: Article): GuideSummary | null {
  const cover = resolvedMedia(article.cover);
  if (!cover || !article.publishedAt || !cover.objectKey) return null;

  return {
    cover: {
      aiGenerated: cover.aiGenerated,
      alt: cover.alt,
      height: cover.height ?? 675,
      url: buildCmsMediaCdnUrl(cover.objectKey),
      width: cover.width ?? 1200,
    },
    id: article.id,
    publishedAt: article.publishedAt,
    slug: article.slug,
    title: article.title,
  };
}

const loadPublishedGuides = async (): Promise<GuideSummary[]> => {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "articles",
    depth: 1,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    sort: "-publishedAt",
    where: {
      and: [
        { _status: { equals: "published" } },
        { locale: { equals: "en" } },
        { publishedAt: { exists: true } },
      ],
    },
  });

  return result.docs
    .map(toSummary)
    .filter((article): article is GuideSummary => article !== null);
};

const loadPublishedGuideBySlug = async (
  slug: string,
): Promise<GuideDetail | null> => {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "articles",
    depth: 1,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: "published" } },
        { locale: { equals: "en" } },
        { publishedAt: { exists: true } },
      ],
    },
  });
  const article = result.docs[0];
  if (!article) return null;

  const summary = toSummary(article);
  return summary ? { ...summary, body: article.body } : null;
};

export const getPublishedGuides = cache(
  unstable_cache(loadPublishedGuides, ["published-guides"], {
    revalidate: GUIDES_REVALIDATE_SECONDS,
    tags: ["guides"],
  }),
);

export const getPublishedGuideBySlug = cache(
  unstable_cache(loadPublishedGuideBySlug, ["published-guide-by-slug"], {
    revalidate: GUIDES_REVALIDATE_SECONDS,
    tags: ["guides"],
  }),
);

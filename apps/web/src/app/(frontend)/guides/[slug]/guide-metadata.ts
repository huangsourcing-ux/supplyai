import type { Metadata } from "next";

import { extractLexicalPlainText } from "@/cms/published-clusters";

import type { GuideDetail } from "../guide-data";

export function buildGuideDescription(body: unknown, fallback: string): string {
  const plainText = extractLexicalPlainText(body);
  return Array.from(plainText || fallback)
    .slice(0, 155)
    .join("");
}

export function buildGuideMetadata(
  article: GuideDetail,
  fallbackDescription: string,
): Metadata {
  const canonicalPath = `/guides/${article.slug}`;
  const description = buildGuideDescription(article.body, fallbackDescription);

  return {
    alternates: {
      canonical: canonicalPath,
      languages: { en: canonicalPath },
    },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: article.cover.alt,
          height: article.cover.height,
          url: article.cover.url,
          width: article.cover.width,
        },
      ],
      locale: "en_US",
      publishedTime: article.publishedAt,
      siteName: "ChinaSupply.AI",
      title: article.title,
      type: "article",
      url: canonicalPath,
    },
    title: `${article.title} | ChinaSupply.AI`,
  };
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import {
  extractClusterCardIds,
  fetchPublishedClusters,
} from "@/cms/published-clusters";

import {
  getPublishedGuideBySlug,
  GUIDES_REVALIDATE_SECONDS,
} from "../guide-data";
import "../guides.css";
import { GuideBody } from "./guide-body";
import { buildGuideMetadata } from "./guide-metadata";

export const revalidate = 900;

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): [] {
  return [];
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [article, translate] = await Promise.all([
    getPublishedGuideBySlug(slug),
    getTranslations("Guides.metadata"),
  ]);
  if (!article) notFound();
  return buildGuideMetadata(article, translate("descriptionFallback"));
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const [article, locale, translate] = await Promise.all([
    getPublishedGuideBySlug(slug),
    getLocale(),
    getTranslations("Guides"),
  ]);
  if (!article) notFound();

  const clusterIds = extractClusterCardIds(article.body);
  let clusters = new Map<
    string,
    Awaited<ReturnType<typeof fetchPublishedClusters>>[number]
  >();
  if (clusterIds.length > 0) {
    try {
      const publishedClusters = await fetchPublishedClusters({
        cache: "force-cache",
        next: { revalidate: GUIDES_REVALIDATE_SECONDS },
      });
      clusters = new Map(
        publishedClusters.map((cluster) => [cluster.id, cluster]),
      );
    } catch {
      // Article content remains available; every Cluster Card renders unavailable.
    }
  }

  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(article.publishedAt),
  );

  return (
    <main className="guide-page">
      <article>
        <header className="guide-header">
          <Link href="/guides">{translate("backToGuides")}</Link>
          <p>{translate("eyebrow")}</p>
          <h1>{article.title}</h1>
          <time dateTime={article.publishedAt}>
            {translate("published", { date })}
          </time>
        </header>
        <figure className="guide-cover">
          <Image
            alt={article.cover.alt}
            height={article.cover.height}
            priority
            src={article.cover.url}
            width={article.cover.width}
          />
          {article.cover.aiGenerated ? (
            <figcaption>{translate("aiGenerated")}</figcaption>
          ) : null}
        </figure>
        <div className="guide-body">
          <GuideBody
            body={article.body}
            clusters={clusters}
            labels={{
              factoryCount: (count) =>
                translate("clusterCard.factoryCount", { count }),
              unavailable: translate("clusterCard.unavailable"),
              viewCluster: translate("clusterCard.viewCluster"),
            }}
          />
        </div>
      </article>
    </main>
  );
}

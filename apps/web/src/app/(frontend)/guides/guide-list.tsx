import Image from "next/image";
import Link from "next/link";
import React from "react";

import type { GuideSummary } from "./guide-data";

interface GuideListProps {
  articles: GuideSummary[];
  labels: Readonly<{
    aiGenerated: string;
    empty: string;
    readGuide: string;
  }>;
  locale: string;
}

export function GuideList({ articles, labels, locale }: GuideListProps) {
  if (articles.length === 0) {
    return <p className="guides-empty">{labels.empty}</p>;
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="guides-grid">
      {articles.map((article) => (
        <article className="guide-list-card" key={article.id}>
          <Link
            aria-label={`${labels.readGuide}: ${article.title}`}
            className="guide-list-card__image"
            href={`/guides/${article.slug}`}
          >
            <Image
              alt={article.cover.alt}
              height={article.cover.height}
              src={article.cover.url}
              width={article.cover.width}
            />
            {article.cover.aiGenerated ? (
              <span className="guide-ai-label">{labels.aiGenerated}</span>
            ) : null}
          </Link>
          <div className="guide-list-card__copy">
            <time dateTime={article.publishedAt}>
              {dateFormatter.format(new Date(article.publishedAt))}
            </time>
            <h2>
              <Link href={`/guides/${article.slug}`}>{article.title}</Link>
            </h2>
          </div>
        </article>
      ))}
    </div>
  );
}

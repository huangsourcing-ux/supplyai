import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { buildPublicPageMetadata } from "@/seo/metadata";

import { getPublishedGuides } from "./guide-data";
import { GuideList } from "./guide-list";
import "./guides.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Guides.metadata");

  return buildPublicPageMetadata({
    description: translate("description"),
    path: "/guides",
    title: translate("title"),
  });
}

export default async function GuidesPage() {
  const [articles, locale, translate] = await Promise.all([
    getPublishedGuides(),
    getLocale(),
    getTranslations("Guides"),
  ]);

  return (
    <main className="guides-page">
      <header className="guides-hero">
        <p>{translate("eyebrow")}</p>
        <h1>{translate("title")}</h1>
        <span>{translate("description")}</span>
      </header>
      <GuideList
        articles={articles}
        labels={{
          aiGenerated: translate("aiGenerated"),
          empty: translate("empty"),
          readGuide: translate("readGuide"),
        }}
        locale={locale}
      />
    </main>
  );
}

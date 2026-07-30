import { getLocale, getTranslations } from "next-intl/server";

import { getPublishedGuides } from "./guide-data";
import { GuideList } from "./guide-list";
import "./guides.css";

export const dynamic = "force-dynamic";

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

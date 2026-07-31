import { getTranslations } from "next-intl/server";

import { ListSkeleton } from "../list-skeleton";
import "./guides.css";

export default async function GuidesLoading() {
  const translate = await getTranslations("Guides");

  return (
    <main className="guides-page">
      <header className="guides-hero">
        <p>{translate("eyebrow")}</p>
        <h1>{translate("title")}</h1>
        <span>{translate("description")}</span>
      </header>
      <div className="guides-loading">
        <ListSkeleton items={4} label={translate("loading")} />
      </div>
    </main>
  );
}

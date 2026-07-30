import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function GuideNotFound() {
  const translate = await getTranslations("Guides.notFound");
  return (
    <main className="guides-page guides-empty-page">
      <p>{translate("eyebrow")}</p>
      <h1>{translate("title")}</h1>
      <span>{translate("description")}</span>
      <Link href="/guides">{translate("back")}</Link>
    </main>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const translate = await getTranslations("Home");

  return (
    <main className="page-shell">
      <section className="foundation-card">
        <p className="eyebrow">{translate("eyebrow")}</p>
        <h1>{translate("title")}</h1>
        <p className="description">{translate("description")}</p>
        <div className="actions">
          <Link className="button-link" href="/admin">
            {translate("payloadAdmin")}
          </Link>
          <Link className="button-link" href="/ops">
            {translate("operations")}
          </Link>
        </div>
      </section>
    </main>
  );
}

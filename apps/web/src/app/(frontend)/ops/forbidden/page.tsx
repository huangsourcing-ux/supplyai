import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function OperationsForbiddenPage() {
  const translate = await getTranslations("Operations");

  return (
    <main className="page-shell">
      <section className="foundation-card">
        <p className="eyebrow">{translate("forbiddenEyebrow")}</p>
        <h1>{translate("forbiddenTitle")}</h1>
        <p className="description">{translate("forbiddenDescription")}</p>
        <div className="actions">
          <Link className="button-link" href="/">
            {translate("backHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}

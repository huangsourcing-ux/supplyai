import { getTranslations } from "next-intl/server";

import { requireOpsAdmin } from "@/auth/require-ops-admin";

export default async function OperationsPage() {
  const [{ userId }, translate] = await Promise.all([
    requireOpsAdmin(),
    getTranslations("Operations"),
  ]);

  return (
    <main className="page-shell">
      <section className="foundation-card">
        <p className="eyebrow">{translate("readyEyebrow")}</p>
        <h1>{translate("readyTitle")}</h1>
        <p className="description">{translate("readyDescription")}</p>
        <p className="identifier">
          {translate("signedInAs")}: {userId}
        </p>
      </section>
    </main>
  );
}

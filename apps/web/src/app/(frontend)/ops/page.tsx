import { getTranslations } from "next-intl/server";

import { requireOpsAdmin } from "@/auth/require-ops-admin";

import { ApiHealthStatus } from "./api-health-status";
import { SentrySmoke } from "./sentry-smoke";

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
        <ApiHealthStatus
          labels={{
            error: translate("apiHealth.error"),
            loading: translate("apiHealth.loading"),
            ready: translate("apiHealth.ready"),
          }}
        />
        <SentrySmoke
          buttonLabel={translate("sentry.button")}
          environmentLabel={translate("sentry.environment")}
          eventLabel={translate("sentry.event")}
          flushFailedLabel={translate("sentry.flushFailed")}
          releaseLabel={translate("sentry.release")}
          sentLabel={translate("sentry.sent")}
        />
      </section>
    </main>
  );
}

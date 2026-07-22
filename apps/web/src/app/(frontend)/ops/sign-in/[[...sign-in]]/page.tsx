import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { hasAdminRole } from "@/auth/admin-role";
import {
  OPS_FORBIDDEN_PATH,
  OPS_HOME_PATH,
  OPS_SIGN_IN_PATH,
} from "@/auth/ops-routes";

export default async function OperationsSignInPage() {
  const { sessionClaims, userId } = await auth();

  if (userId) {
    redirect(hasAdminRole(sessionClaims) ? OPS_HOME_PATH : OPS_FORBIDDEN_PATH);
  }

  const translate = await getTranslations("Operations");

  return (
    <main className="page-shell">
      <section className="clerk-shell">
        <div className="foundation-card">
          <p className="eyebrow">{translate("signInEyebrow")}</p>
          <h1>{translate("signInTitle")}</h1>
          <p className="description">{translate("signInDescription")}</p>
        </div>
        <SignIn
          forceRedirectUrl={OPS_HOME_PATH}
          path={OPS_SIGN_IN_PATH}
          routing="path"
          withSignUp={false}
        />
      </section>
    </main>
  );
}

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import React from "react";

import {
  PUBLIC_AUTH_FALLBACK_PATH,
  PUBLIC_SIGN_IN_PATH,
} from "@/auth/public-auth-routes";
import { PUBLIC_PRIVACY_PATH, PUBLIC_TERMS_PATH } from "@/legal/legal-routes";

export default async function PublicSignInPage() {
  const translate = await getTranslations("Authentication");

  return (
    <main className="page-shell">
      <section className="clerk-shell">
        <div className="foundation-card">
          <p className="eyebrow">{translate("signInEyebrow")}</p>
          <h1>{translate("signInTitle")}</h1>
          <p className="description">{translate("signInDescription")}</p>
        </div>
        <SignIn
          fallbackRedirectUrl={PUBLIC_AUTH_FALLBACK_PATH}
          path={PUBLIC_SIGN_IN_PATH}
          routing="path"
          signUpFallbackRedirectUrl={PUBLIC_AUTH_FALLBACK_PATH}
          withSignUp
        />
        <p className="legal-notice">
          {translate.rich("legalNotice", {
            privacy: (chunks) => (
              <Link href={PUBLIC_PRIVACY_PATH}>{chunks}</Link>
            ),
            terms: (chunks) => <Link href={PUBLIC_TERMS_PATH}>{chunks}</Link>,
          })}
        </p>
      </section>
    </main>
  );
}

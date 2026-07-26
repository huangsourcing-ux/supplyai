import { SignIn } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import React from "react";

import {
  PUBLIC_AUTH_FALLBACK_PATH,
  PUBLIC_SIGN_IN_PATH,
} from "@/auth/public-auth-routes";

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
      </section>
    </main>
  );
}

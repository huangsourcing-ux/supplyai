import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import React from "react";

import { AccountPageClient } from "./account-page-client";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Account.metadata");
  return {
    description: translate("description"),
    robots: {
      follow: false,
      index: false,
    },
    title: translate("title"),
  };
}

export default async function AccountPage() {
  const translate = await getTranslations("Account");

  return (
    <AccountPageClient
      labels={{
        cancel: translate("delete.cancel"),
        deleteAction: translate("delete.action"),
        deleteConfirm: translate("delete.confirm"),
        deleteDescription: translate("delete.description"),
        deleteError: translate("delete.error"),
        deletePending: translate("delete.pending"),
        deleteTitle: translate("delete.title"),
        description: translate("description"),
        emailFallback: translate("emailFallback"),
        emailLabel: translate("emailLabel"),
        eyebrow: translate("eyebrow"),
        languageDescription: translate("language.description"),
        languageEnglish: translate("language.english"),
        languageLabel: translate("language.action"),
        languageSaveError: translate("language.error"),
        languageSaved: translate("language.saved"),
        languageSaving: translate("language.saving"),
        languageTitle: translate("language.title"),
        loading: translate("loading"),
        signIn: translate("signIn.action"),
        signInDescription: translate("signIn.description"),
        signInTitle: translate("signIn.title"),
        signOut: translate("signOut.action"),
        signingOut: translate("signOut.pending"),
        title: translate("title"),
      }}
    />
  );
}

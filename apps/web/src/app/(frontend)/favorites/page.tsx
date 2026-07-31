import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import React from "react";

import { FavoritesPageClient } from "./favorites-page-client";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Favorites.metadata");
  return {
    description: translate("description"),
    robots: {
      follow: false,
      index: false,
    },
    title: translate("title"),
  };
}

export default async function FavoritesPage() {
  const translate = await getTranslations("Favorites");

  return (
    <FavoritesPageClient
      labels={{
        allLoaded: translate("allLoaded"),
        cluster: translate("tabs.cluster"),
        description: translate("description"),
        empty: translate("empty"),
        error: translate("error"),
        eyebrow: translate("eyebrow"),
        factory: translate("tabs.factory"),
        loadMore: translate("loadMore"),
        loading: translate("loading"),
        loadingMore: translate("loadingMore"),
        moreMayMatch: translate("moreMayMatch"),
        remove: translate("remove"),
        removeError: translate("removeError"),
        removed: translate("removed"),
        removing: translate("removing"),
        retry: translate("retry"),
        signIn: translate("signIn.action"),
        signInDescription: translate("signIn.description"),
        signInTitle: translate("signIn.title"),
        title: translate("title"),
        unavailable: translate("unavailable.title"),
        unavailableDescription: translate("unavailable.description"),
        unverified: translate("unverified"),
        verified: translate("verified"),
        viewDetails: translate("viewDetails"),
      }}
    />
  );
}

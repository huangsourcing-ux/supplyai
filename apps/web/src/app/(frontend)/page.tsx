import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { buildPublicPageMetadata } from "@/seo/metadata";

import { IndustrialMap } from "./map/industrial-map";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Home.metadata");

  return buildPublicPageMetadata({
    description: translate("description"),
    path: "/",
    title: translate("title"),
  });
}

export default async function HomePage() {
  const [home, map] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Map"),
  ]);

  return (
    <main className="map-page">
      <h1 className="sr-only">{home("title")}</h1>
      <IndustrialMap
        labels={{
          ariaLabel: map("ariaLabel"),
          attributionLabel: map("attributionLabel"),
          dataError: map("dataError"),
          loading: map("loading"),
          mapError: map("mapError"),
          mapTilerLogoAlt: map("mapTilerLogoAlt"),
          retry: map("retry"),
          truncated: map("truncated"),
        }}
      />
    </main>
  );
}

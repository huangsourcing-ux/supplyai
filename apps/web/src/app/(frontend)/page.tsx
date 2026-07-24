import { getTranslations } from "next-intl/server";

import { IndustrialMap } from "./map/industrial-map";

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
        }}
      />
    </main>
  );
}

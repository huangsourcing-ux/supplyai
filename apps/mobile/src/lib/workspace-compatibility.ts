import { isWgs84Position, WGS84_COORDINATE_ORDER } from "@chinasupply/geo";
import { sharedEnglishResources } from "@chinasupply/i18n";
import { localizedTextSchema } from "@chinasupply/schemas";

const localizedBrand = localizedTextSchema.parse({
  en: sharedEnglishResources.brand.name,
  zh: sharedEnglishResources.brand.name,
});

export const workspaceCompatibility = Object.freeze({
  coordinateOrder: WGS84_COORDINATE_ORDER,
  localizedBrand,
  ready:
    isWgs84Position([120.075, 29.306]) &&
    localizedBrand.en === sharedEnglishResources.brand.name,
});

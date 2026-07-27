import { type StyleSpecification } from "@maplibre/maplibre-react-native";
import { Platform } from "react-native";

import { createChinaSupplyMapStyle } from "@chinasupply/config/map/style";

import { mobileEnvironment } from "../env";

type MobileMapPlatform = "android" | "ios";

export function getMobileMapTilerKey(platform: MobileMapPlatform): string {
  const key =
    platform === "ios"
      ? mobileEnvironment.EXPO_PUBLIC_MAPTILER_IOS_KEY
      : mobileEnvironment.EXPO_PUBLIC_MAPTILER_ANDROID_KEY;

  return key ?? "";
}

export function createMobileMapStyle(
  platform: MobileMapPlatform = Platform.OS === "ios" ? "ios" : "android",
): StyleSpecification {
  return createChinaSupplyMapStyle(
    getMobileMapTilerKey(platform),
  ) as unknown as StyleSpecification;
}

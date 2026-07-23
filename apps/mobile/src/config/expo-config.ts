import type { ExpoConfig } from "@expo/config";

import { getMobileIdentity } from "./app-identity";
import type { MobileEnvironment } from "./app-identity";

export function createMobileExpoConfig(
  environment: MobileEnvironment,
  config: Partial<ExpoConfig> = {},
): ExpoConfig {
  const identity = getMobileIdentity(environment);

  return {
    ...config,
    name: identity.name,
    slug: "chinasupply-ai",
    owner: "huangsourcing",
    scheme: identity.scheme,
    version: "0.0.1",
    orientation: "portrait",
    icon: "./assets/app-icon-placeholder.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: identity.bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: identity.androidPackage,
      adaptiveIcon: {
        foregroundImage: "./assets/app-icon-placeholder.png",
        backgroundColor: "#0F172A",
      },
    },
    plugins: [
      "expo-localization",
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0F172A",
          image: "./assets/app-icon-placeholder.png",
          imageWidth: 160,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appEnvironment: environment,
    },
  };
}

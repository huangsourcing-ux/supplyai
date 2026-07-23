import type { ExpoConfig } from "@expo/config";

import { getMobileIdentity } from "./app-identity";
import type { MobileEnvironment } from "./app-identity";

const easProjectId = "cac33d97-75d7-4975-899f-00d661bf979d";
const appVersion = "0.0.1";

export interface MobileSentryBuildConfig {
  organization?: string;
  project?: string;
}

export function resolveMobileSentryBuildConfig(
  source: Record<string, string | undefined>,
  environment: MobileEnvironment,
): MobileSentryBuildConfig {
  const organization = source.SENTRY_ORG;
  const project = source.SENTRY_PROJECT;
  const authToken = source.SENTRY_AUTH_TOKEN;

  if (environment !== "local") {
    const missing = [
      organization ? undefined : "SENTRY_ORG",
      project ? undefined : "SENTRY_PROJECT",
      authToken?.startsWith("sntrys_") ? undefined : "SENTRY_AUTH_TOKEN",
    ].filter((field): field is string => field !== undefined);

    if (missing.length > 0) {
      throw new Error(
        `Mobile Sentry build environment validation failed: ${missing.join(", ")}`,
      );
    }
  }

  return { organization, project };
}

export function createMobileExpoConfig(
  environment: MobileEnvironment,
  config: Partial<ExpoConfig> = {},
  sentry: MobileSentryBuildConfig = {},
): ExpoConfig {
  const identity = getMobileIdentity(environment);

  return {
    ...config,
    name: identity.name,
    slug: "chinasupply-ai",
    owner: "huangsourcing",
    scheme: identity.scheme,
    version: appVersion,
    orientation: "portrait",
    icon: "./assets/app-icon-placeholder.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      buildNumber: "1",
      supportsTablet: true,
      bundleIdentifier: identity.bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      versionCode: 1,
      package: identity.androidPackage,
      adaptiveIcon: {
        foregroundImage: "./assets/app-icon-placeholder.png",
        backgroundColor: "#0F172A",
      },
    },
    plugins: [
      "expo-localization",
      "expo-router",
      "@maplibre/maplibre-react-native",
      sentry.organization && sentry.project
        ? [
            "@sentry/react-native/expo",
            {
              organization: sentry.organization,
              project: sentry.project,
              url: "https://sentry.io/",
            },
          ]
        : "@sentry/react-native/expo",
      [
        "expo-build-properties",
        {
          android: {
            ...(environment === "staging" ? { buildArchs: ["arm64-v8a"] } : {}),
            packagingOptions: {
              exclude: ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"],
            },
          },
        },
      ],
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
      eas: {
        projectId: easProjectId,
      },
    },
  };
}

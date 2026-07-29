import type { ExpoConfig } from "@expo/config";

import { getMobileIdentity } from "./app-identity";
import type { MobileEnvironment } from "./app-identity";

const easProjectId = "cac33d97-75d7-4975-899f-00d661bf979d";
const appVersion = "0.0.1";

export const androidBlockedPermissions = [
  "android.permission.MANAGE_EXTERNAL_STORAGE",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.VIBRATE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

export const iosPrivacyManifests = {
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
      NSPrivacyAccessedAPITypeReasons: ["C617.1", "0A2A.1", "3B52.1"],
    },
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
      NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
    },
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
      NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"],
    },
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
      NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
    },
  ],
  NSPrivacyCollectedDataTypes: [
    "Name",
    "EmailAddress",
    "UserID",
    "SearchHistory",
    "ProductInteraction",
    "CrashData",
    "PerformanceData",
    "OtherDiagnosticData",
  ].map((dataType) => ({
    NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${dataType}`,
    NSPrivacyCollectedDataTypeLinked: [
      "Name",
      "EmailAddress",
      "UserID",
      "ProductInteraction",
    ].includes(dataType),
    NSPrivacyCollectedDataTypePurposes: [
      "NSPrivacyCollectedDataTypePurposeAppFunctionality",
    ],
    NSPrivacyCollectedDataTypeTracking: false,
  })),
  NSPrivacyTracking: false,
} satisfies NonNullable<NonNullable<ExpoConfig["ios"]>["privacyManifests"]>;

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
  const isEasBuild = source.EAS_BUILD === "true";

  if (environment !== "local") {
    const missing = [
      organization ? undefined : "SENTRY_ORG",
      project ? undefined : "SENTRY_PROJECT",
      isEasBuild && !authToken?.startsWith("sntrys_")
        ? "SENTRY_AUTH_TOKEN"
        : undefined,
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
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      privacyManifests: iosPrivacyManifests,
    },
    android: {
      allowBackup: false,
      blockedPermissions: androidBlockedPermissions,
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
      "expo-apple-authentication",
      "@maplibre/maplibre-react-native",
      "@clerk/expo",
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

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  createMobileExpoConfig,
  resolveMobileSentryBuildConfig,
} from "./expo-config";

interface EasConfig {
  build: {
    production: {
      env?: Record<string, string>;
      environment?: string;
    };
  };
}

describe("Expo application config", () => {
  it("keeps New Architecture enabled and links the EAS project", () => {
    const config = createMobileExpoConfig("local");

    expect(config.newArchEnabled).toBe(true);
    expect(config.ios?.bundleIdentifier).toBe("ai.chinasupply.app.local");
    expect(config.android?.package).toBe("ai.chinasupply.app.local");
    expect(config.extra).toHaveProperty(
      "eas.projectId",
      "cac33d97-75d7-4975-899f-00d661bf979d",
    );
    expect(config.plugins).toContain("@maplibre/maplibre-react-native");
    expect(config.plugins).toContain("@clerk/expo");
    expect(config.plugins).toContain("expo-apple-authentication");
    expect(config.plugins).toContain("@sentry/react-native/expo");
    expect(config.ios?.buildNumber).toBe("1");
    expect(config.ios?.usesAppleSignIn).toBe(true);
    expect(config.ios?.privacyManifests?.NSPrivacyTracking).toBe(false);
    expect(
      config.ios?.privacyManifests?.NSPrivacyCollectedDataTypes?.map(
        ({ NSPrivacyCollectedDataType }) => NSPrivacyCollectedDataType,
      ),
    ).toEqual([
      "NSPrivacyCollectedDataTypeName",
      "NSPrivacyCollectedDataTypeEmailAddress",
      "NSPrivacyCollectedDataTypeUserID",
      "NSPrivacyCollectedDataTypeSearchHistory",
      "NSPrivacyCollectedDataTypeProductInteraction",
      "NSPrivacyCollectedDataTypeCrashData",
      "NSPrivacyCollectedDataTypePerformanceData",
      "NSPrivacyCollectedDataTypeOtherDiagnosticData",
    ]);
    expect(config.ios?.privacyManifests?.NSPrivacyAccessedAPITypes).toEqual([
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
    ]);
    expect(config.android?.versionCode).toBe(1);
    expect(config.android?.allowBackup).toBe(false);
    expect(config.android?.blockedPermissions).toEqual([
      "android.permission.MANAGE_EXTERNAL_STORAGE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.VIBRATE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ]);
    expect(config.plugins).toContainEqual([
      "expo-build-properties",
      {
        android: {
          packagingOptions: {
            exclude: ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"],
          },
        },
      },
    ]);
  });

  it("writes only public Sentry project identifiers before submission", () => {
    expect(() => resolveMobileSentryBuildConfig({}, "staging")).toThrow(
      /SENTRY_ORG/,
    );

    const sentry = resolveMobileSentryBuildConfig(
      {
        SENTRY_ORG: "chinasupply",
        SENTRY_PROJECT: "chinasupply-mobile",
      },
      "staging",
    );
    const config = createMobileExpoConfig("staging", {}, sentry);

    expect(config.plugins).toContainEqual([
      "@sentry/react-native/expo",
      {
        organization: "chinasupply",
        project: "chinasupply-mobile",
        url: "https://sentry.io/",
      },
    ]);
  });

  it("requires the source map upload token inside EAS Build", () => {
    expect(() =>
      resolveMobileSentryBuildConfig(
        {
          EAS_BUILD: "true",
          SENTRY_ORG: "chinasupply",
          SENTRY_PROJECT: "chinasupply-mobile",
        },
        "staging",
      ),
    ).toThrow(/SENTRY_AUTH_TOKEN/);

    const sentry = resolveMobileSentryBuildConfig(
      {
        EAS_BUILD: "true",
        SENTRY_AUTH_TOKEN: "sntrys_actual_token",
        SENTRY_ORG: "chinasupply",
        SENTRY_PROJECT: "chinasupply-mobile",
      },
      "staging",
    );

    expect(JSON.stringify(sentry)).not.toContain("sntrys_actual_token");
  });

  it("keeps the staging Preview APK focused on arm64 devices", () => {
    const config = createMobileExpoConfig("staging");

    expect(config.plugins).toContainEqual([
      "expo-build-properties",
      {
        android: {
          buildArchs: ["arm64-v8a"],
          packagingOptions: {
            exclude: ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"],
          },
        },
      },
    ]);
  });

  it("pins the production EAS profile to the production app environment", () => {
    const easConfig = JSON.parse(
      readFileSync(join(__dirname, "../../eas.json"), "utf8"),
    ) as EasConfig;

    expect(easConfig.build.production.environment).toBe("production");
    expect(easConfig.build.production.env).toEqual({
      EXPO_PUBLIC_APP_ENV: "production",
    });
  });
});

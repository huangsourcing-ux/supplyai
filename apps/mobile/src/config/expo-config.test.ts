import {
  createMobileExpoConfig,
  resolveMobileSentryBuildConfig,
} from "./expo-config";

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
    expect(config.plugins).toContain("@sentry/react-native/expo");
    expect(config.ios?.buildNumber).toBe("1");
    expect(config.android?.versionCode).toBe(1);
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

  it("requires upload credentials and writes only public project identifiers", () => {
    expect(() => resolveMobileSentryBuildConfig({}, "staging")).toThrow(
      /SENTRY_AUTH_TOKEN, SENTRY_ORG|SENTRY_ORG/,
    );

    const sentry = resolveMobileSentryBuildConfig(
      {
        SENTRY_AUTH_TOKEN: "sntrys_actual_token",
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
    expect(JSON.stringify(config)).not.toContain("sntrys_actual_token");
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
});

import { createMobileExpoConfig } from "./expo-config";

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

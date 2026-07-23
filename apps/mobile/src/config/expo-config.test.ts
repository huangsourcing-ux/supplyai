import { createMobileExpoConfig } from "./expo-config";

describe("Expo application config", () => {
  it("keeps New Architecture enabled and omits an unlinked EAS project", () => {
    const config = createMobileExpoConfig("local");

    expect(config.newArchEnabled).toBe(true);
    expect(config.ios?.bundleIdentifier).toBe("ai.chinasupply.app.local");
    expect(config.android?.package).toBe("ai.chinasupply.app.local");
    expect(config.extra).not.toHaveProperty("eas.projectId");
    expect(config.plugins).toContain("@maplibre/maplibre-react-native");
  });
});

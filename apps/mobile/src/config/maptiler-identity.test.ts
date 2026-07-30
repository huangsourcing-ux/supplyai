import { getMapTilerRequestIdentity } from "./maptiler-identity";

const keys = {
  android: "android-key",
  ios: "ios-key",
};

describe("MapTiler request identity", () => {
  it("maps the staging iOS key and Bundle ID to the restricted User-Agent", () => {
    expect(getMapTilerRequestIdentity("staging", "ios", keys)).toEqual({
      key: "ios-key",
      userAgent: "ChinaSupplyAI-iOS/ai.chinasupply.app.staging",
    });
  });

  it("maps the staging Android key and package to the restricted User-Agent", () => {
    expect(getMapTilerRequestIdentity("staging", "android", keys)).toEqual({
      key: "android-key",
      userAgent: "ChinaSupplyAI-Android/ai.chinasupply.app.staging",
    });
  });

  it.each([
    ["local", "ai.chinasupply.app.local"],
    ["production", "ai.chinasupply.mobile"],
  ] as const)(
    "derives the %s identifiers from the canonical mobile identity",
    (environment, identifier) => {
      expect(
        getMapTilerRequestIdentity(environment, "ios", keys).userAgent,
      ).toBe(`ChinaSupplyAI-iOS/${identifier}`);
      expect(
        getMapTilerRequestIdentity(environment, "android", keys).userAgent,
      ).toBe(`ChinaSupplyAI-Android/${identifier}`);
    },
  );
});

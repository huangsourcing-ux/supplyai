import { createChinaSupplyMapStyle } from "@chinasupply/config/map/style";

import { createMobileMapStyle, getMobileMapTilerKey } from "./mobile-map-style";

describe("mobile map style", () => {
  it("selects the isolated iOS key for the iOS style", () => {
    createMobileMapStyle("ios");

    expect(getMobileMapTilerKey("ios")).toBe("replace_me_ios");
    expect(createChinaSupplyMapStyle).toHaveBeenLastCalledWith(
      "replace_me_ios",
    );
  });

  it("selects the isolated Android key for the Android style", () => {
    createMobileMapStyle("android");

    expect(getMobileMapTilerKey("android")).toBe("replace_me_android");
    expect(createChinaSupplyMapStyle).toHaveBeenLastCalledWith(
      "replace_me_android",
    );
  });
});

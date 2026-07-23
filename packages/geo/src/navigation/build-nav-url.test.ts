import { describe, expect, it } from "vitest";

import { wgs84ToBd09, wgs84ToGcj02 } from "../conversions.js";
import { buildNavUrl } from "./build-nav-url.js";
import { NAVIGATION_VALIDATION_FIXTURES } from "./fixtures.js";
import type {
  NavigationTarget,
  NavigationUrls,
  NavigationValidationFixture,
} from "./types.js";

interface ExpectedFixture {
  bd09: readonly [number, number];
  gcj02: readonly [number, number];
  id: NavigationValidationFixture["id"];
  latitudeLongitude: string;
  longitudeLatitude: string;
}

const expectedFixtures = [
  {
    id: "beijing-national-convention-center",
    latitudeLongitude: "39.998471,116.383839",
    longitudeLatitude: "116.383839,39.998471",
    gcj02: [116.390086295, 39.999871012],
    bd09: [116.396498545, 40.006179839],
  },
  {
    id: "shanghai-national-exhibition-convention-center",
    latitudeLongitude: "31.192051,121.297195",
    longitudeLatitude: "121.297195,31.192051",
    gcj02: [121.301668648, 31.190049915],
    bd09: [121.308105329, 31.196256194],
  },
  {
    id: "yiwu-international-trade-city-district-1",
    latitudeLongitude: "29.330690,120.098163",
    longitudeLatitude: "120.098163,29.330690",
    gcj02: [120.102894582, 29.32822957],
    bd09: [120.10935082, 29.334457513],
  },
  {
    id: "shenzhen-convention-exhibition-center",
    latitudeLongitude: "22.533504,114.054747",
    longitudeLatitude: "114.054747,22.533504",
    gcj02: [114.05985677, 22.530780527],
    bd09: [114.066404755, 22.536434485],
  },
  {
    id: "dongguan-guangdong-modern-international-exhibition-center",
    latitudeLongitude: "22.903095,113.652227",
    longitudeLatitude: "113.652227,22.903095",
    gcj02: [113.65732322, 22.900190487],
    bd09: [113.663764015, 22.906397152],
  },
] as const satisfies readonly ExpectedFixture[];

const targetVariants = [
  { platform: "ios", provider: "apple" },
  { platform: "ios", provider: "google" },
  { platform: "ios", provider: "amap" },
  { platform: "ios", provider: "baidu" },
  { platform: "android", provider: "google" },
  { platform: "android", provider: "amap" },
  { platform: "android", provider: "baidu" },
] as const;

function expectedUrls(
  target: NavigationTarget,
  fixture: NavigationValidationFixture,
  expected: ExpectedFixture,
): NavigationUrls {
  const name = encodeURIComponent(fixture.destinationName);
  const wgs84Link = (url: string) => ({
    coordinateMode: "wgs84" as const,
    url,
  });

  switch (target.provider) {
    case "apple": {
      const url = `https://maps.apple.com/?daddr=${expected.latitudeLongitude.replace(",", "%2C")}&dirflg=d`;

      return {
        app: wgs84Link(url),
        webFallback: wgs84Link(url),
      };
    }
    case "google": {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${expected.latitudeLongitude.replace(",", "%2C")}&travelmode=driving`;

      return {
        app: wgs84Link(url),
        webFallback: wgs84Link(url),
      };
    }
    case "amap": {
      const appBase =
        target.platform === "ios" ? "iosamap://path" : "amapuri://route/plan/";
      const appUrl = `${appBase}?sourceApplication=ChinaSupply.AI&sid=&slat=&slon=&sname=&did=&dlat=${expected.latitudeLongitude.split(",")[0]}&dlon=${expected.longitudeLatitude.split(",")[0]}&dname=${name}&dev=1&t=0`;
      const webFallbackUrl = `https://uri.amap.com/navigation?from=&to=${expected.longitudeLatitude.replaceAll(",", "%2C")}%2C${name}&mode=car&policy=0&src=chinasupply.ai&callnative=0`;

      return {
        app: wgs84Link(appUrl),
        webFallback: wgs84Link(webFallbackUrl),
      };
    }
    case "baidu": {
      const source =
        target.platform === "ios"
          ? "ios.chinasupply.ai"
          : "andr.chinasupply.ai";
      const appUrl = `baidumap://map/direction?origin=%E6%88%91%E7%9A%84%E4%BD%8D%E7%BD%AE&destination=name%3A${name}%7Clatlng%3A${expected.latitudeLongitude.replace(",", "%2C")}&mode=driving&coord_type=wgs84&src=${source}`;
      const webFallbackUrl = `http://api.map.baidu.com/marker?location=${expected.latitudeLongitude.replace(",", "%2C")}&title=${name}&content=${name}&coord_type=wgs84&output=html&src=webapp.chinasupply.ai`;

      return {
        app: wgs84Link(appUrl),
        webFallback: wgs84Link(webFallbackUrl),
      };
    }
  }
}

describe("buildNavUrl", () => {
  it.each(expectedFixtures)(
    "builds exact route-planning URLs for every provider using $id",
    (expected) => {
      const fixture = NAVIGATION_VALIDATION_FIXTURES.find(
        ({ id }) => id === expected.id,
      );

      expect(fixture).toBeDefined();

      for (const variant of targetVariants) {
        const target = {
          ...variant,
          destinationName: fixture!.destinationName,
        } as NavigationTarget;

        expect(buildNavUrl(target, fixture!.wgs84)).toEqual(
          expectedUrls(target, fixture!, expected),
        );
      }
    },
  );

  it.each(expectedFixtures)(
    "preserves the verified fixture conversion results for $id",
    (expected) => {
      const fixture = NAVIGATION_VALIDATION_FIXTURES.find(
        ({ id }) => id === expected.id,
      )!;

      expect(wgs84ToGcj02(fixture.wgs84)).toEqual([
        expect.closeTo(expected.gcj02[0], 8),
        expect.closeTo(expected.gcj02[1], 8),
      ]);
      expect(wgs84ToBd09(fixture.wgs84)).toEqual([
        expect.closeTo(expected.bd09[0], 8),
        expect.closeTo(expected.bd09[1], 8),
      ]);
    },
  );

  it("uses the verified WGS-84 rule whether original GCJ-02 is supplied or absent", () => {
    const fixture = NAVIGATION_VALIDATION_FIXTURES[0];
    const target = {
      platform: "android",
      provider: "amap",
      destinationName: fixture.destinationName,
    } as const;
    const gcj02 = wgs84ToGcj02(fixture.wgs84);

    expect(buildNavUrl(target, fixture.wgs84, gcj02)).toEqual(
      buildNavUrl(target, fixture.wgs84),
    );
    expect(buildNavUrl(target, fixture.wgs84).app.coordinateMode).toBe("wgs84");
  });

  it("does not mutate target or coordinate inputs", () => {
    const fixture = NAVIGATION_VALIDATION_FIXTURES[0];
    const target = {
      platform: "ios",
      provider: "baidu",
      destinationName: fixture.destinationName,
    } as const;
    const wgs84 = [...fixture.wgs84] as const;
    const gcj02 = wgs84ToGcj02(fixture.wgs84);
    const originalTarget = { ...target };
    const originalWgs84 = [...wgs84];
    const originalGcj02 = [...gcj02];

    buildNavUrl(target, wgs84, gcj02);

    expect(target).toEqual(originalTarget);
    expect(wgs84).toEqual(originalWgs84);
    expect(gcj02).toEqual(originalGcj02);
  });

  it("never creates a force-start live-navigation URL", () => {
    const fixture = NAVIGATION_VALIDATION_FIXTURES[0];

    for (const variant of targetVariants) {
      const result = buildNavUrl(
        { ...variant, destinationName: fixture.destinationName },
        fixture.wgs84,
      );

      expect(result.app.url).not.toContain("dir_action=navigate");
      expect(result.app.url).not.toContain("/navi");
    }
  });

  it("rejects Android Apple Maps at the type boundary", () => {
    // @ts-expect-error Apple Maps is intentionally unavailable on Android.
    const invalidTarget: NavigationTarget = {
      platform: "android",
      provider: "apple",
      destinationName: "国家会议中心",
    };

    expect(invalidTarget.provider).toBe("apple");
  });
});

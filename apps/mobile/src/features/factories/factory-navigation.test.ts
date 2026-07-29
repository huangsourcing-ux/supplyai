import {
  buildMobileFactoryNavigationOptions,
  openMobileFactoryNavigation,
  type MobileFactoryNavigationOption,
} from "./factory-navigation";

const destinationName = "Yiwu Bright Goods Factory";
const position = [120.08, 29.31] as const;
const canonicalOppoName =
  "Guangdong OPPO Mobile Telecommunications Corp., Ltd.";
const canonicalOppoPosition = [113.7771621452, 22.7707857278] as const;

describe("mobile factory navigation options", () => {
  it("builds the approved provider order for each platform", () => {
    expect(
      buildMobileFactoryNavigationOptions(destinationName, position, "ios").map(
        ({ provider }) => provider,
      ),
    ).toEqual(["google", "apple", "amap", "baidu"]);
    expect(
      buildMobileFactoryNavigationOptions(
        destinationName,
        position,
        "android",
      ).map(({ provider }) => provider),
    ).toEqual(["google", "amap", "baidu"]);
  });

  it("preserves WGS-84 order, destination identity, and platform templates", () => {
    const iosOptions = buildMobileFactoryNavigationOptions(
      destinationName,
      position,
      "ios",
    );
    const androidOptions = buildMobileFactoryNavigationOptions(
      destinationName,
      position,
      "android",
    );
    const google = iosOptions.find(({ provider }) => provider === "google")!;
    const iosAmap = iosOptions.find(({ provider }) => provider === "amap")!;
    const androidAmap = androidOptions.find(
      ({ provider }) => provider === "amap",
    )!;
    const baidu = iosOptions.find(({ provider }) => provider === "baidu")!;

    expect(new URL(google.primaryUrl).searchParams.get("destination")).toBe(
      "29.310000,120.080000",
    );
    expect(google.fallbackUrl).toBe(google.primaryUrl);
    expect(iosAmap.primaryUrl).toMatch(/^iosamap:\/\/path\?/u);
    expect(androidAmap.primaryUrl).toMatch(/^amapuri:\/\/route\/plan\/\?/u);
    expect(new URL(iosAmap.primaryUrl).searchParams.get("dname")).toBe(
      destinationName,
    );
    expect(new URL(iosAmap.primaryUrl).searchParams.get("dlat")).toBe(
      "29.310000",
    );
    expect(new URL(iosAmap.primaryUrl).searchParams.get("dlon")).toBe(
      "120.080000",
    );
    expect(new URL(baidu.primaryUrl).searchParams.get("coord_type")).toBe(
      "wgs84",
    );
  });

  it("locks the complete canonical OPPO URLs used by the Maestro journey", () => {
    expect(
      buildMobileFactoryNavigationOptions(
        canonicalOppoName,
        canonicalOppoPosition,
        "ios",
      ),
    ).toEqual([
      {
        fallbackUrl:
          "https://www.google.com/maps/dir/?api=1&destination=22.770786%2C113.777162&travelmode=driving",
        primaryUrl:
          "https://www.google.com/maps/dir/?api=1&destination=22.770786%2C113.777162&travelmode=driving",
        provider: "google",
      },
      {
        fallbackUrl:
          "https://maps.apple.com/?daddr=22.770786%2C113.777162&dirflg=d",
        primaryUrl:
          "https://maps.apple.com/?daddr=22.770786%2C113.777162&dirflg=d",
        provider: "apple",
      },
      {
        fallbackUrl:
          "https://uri.amap.com/navigation?from=&to=113.777162%2C22.770786%2CGuangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&mode=car&policy=0&src=chinasupply.ai&callnative=0",
        primaryUrl:
          "iosamap://path?sourceApplication=ChinaSupply.AI&sid=&slat=&slon=&sname=&did=&dlat=22.770786&dlon=113.777162&dname=Guangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&dev=1&t=0",
        provider: "amap",
      },
      {
        fallbackUrl:
          "http://api.map.baidu.com/marker?location=22.770786%2C113.777162&title=Guangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&content=Guangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&coord_type=wgs84&output=html&src=webapp.chinasupply.ai",
        primaryUrl:
          "baidumap://map/direction?origin=%E6%88%91%E7%9A%84%E4%BD%8D%E7%BD%AE&destination=name%3AGuangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.%7Clatlng%3A22.770786%2C113.777162&mode=driving&coord_type=wgs84&src=ios.chinasupply.ai",
        provider: "baidu",
      },
    ]);

    expect(
      buildMobileFactoryNavigationOptions(
        canonicalOppoName,
        canonicalOppoPosition,
        "android",
      ),
    ).toEqual([
      {
        fallbackUrl:
          "https://www.google.com/maps/dir/?api=1&destination=22.770786%2C113.777162&travelmode=driving",
        primaryUrl:
          "https://www.google.com/maps/dir/?api=1&destination=22.770786%2C113.777162&travelmode=driving",
        provider: "google",
      },
      {
        fallbackUrl:
          "https://uri.amap.com/navigation?from=&to=113.777162%2C22.770786%2CGuangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&mode=car&policy=0&src=chinasupply.ai&callnative=0",
        primaryUrl:
          "amapuri://route/plan/?sourceApplication=ChinaSupply.AI&sid=&slat=&slon=&sname=&did=&dlat=22.770786&dlon=113.777162&dname=Guangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&dev=1&t=0",
        provider: "amap",
      },
      {
        fallbackUrl:
          "http://api.map.baidu.com/marker?location=22.770786%2C113.777162&title=Guangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&content=Guangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.&coord_type=wgs84&output=html&src=webapp.chinasupply.ai",
        primaryUrl:
          "baidumap://map/direction?origin=%E6%88%91%E7%9A%84%E4%BD%8D%E7%BD%AE&destination=name%3AGuangdong+OPPO+Mobile+Telecommunications+Corp.%2C+Ltd.%7Clatlng%3A22.770786%2C113.777162&mode=driving&coord_type=wgs84&src=andr.chinasupply.ai",
        provider: "baidu",
      },
    ]);
  });
});

describe("mobile factory navigation launch", () => {
  const appFirstOption: MobileFactoryNavigationOption = {
    fallbackUrl: "https://maps.example.test/fallback",
    primaryUrl: "maps-app://route",
    provider: "amap",
  };

  it("stops after a successful app launch", async () => {
    const openUrl = jest.fn(async () => undefined);

    await expect(
      openMobileFactoryNavigation(appFirstOption, openUrl),
    ).resolves.toBe("primary");
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith(appFirstOption.primaryUrl);
  });

  it("opens the web fallback only after the app URI is rejected", async () => {
    const openUrl = jest
      .fn<Promise<void>, [string]>()
      .mockRejectedValueOnce(new Error("app unavailable"))
      .mockResolvedValueOnce(undefined);

    await expect(
      openMobileFactoryNavigation(appFirstOption, openUrl),
    ).resolves.toBe("fallback");
    expect(openUrl).toHaveBeenNthCalledWith(1, appFirstOption.primaryUrl);
    expect(openUrl).toHaveBeenNthCalledWith(2, appFirstOption.fallbackUrl);
  });

  it("does not retry an identical HTTPS primary and fallback URL", async () => {
    const httpsOption: MobileFactoryNavigationOption = {
      fallbackUrl: "https://maps.example.test/route",
      primaryUrl: "https://maps.example.test/route",
      provider: "google",
    };
    const error = new Error("system handoff failed");
    const openUrl = jest.fn(async () => {
      throw error;
    });

    await expect(
      openMobileFactoryNavigation(httpsOption, openUrl),
    ).rejects.toBe(error);
    expect(openUrl).toHaveBeenCalledTimes(1);
  });

  it("reports a rejected web fallback to the caller", async () => {
    const openUrl = jest.fn(async () => {
      throw new Error("unavailable");
    });

    await expect(
      openMobileFactoryNavigation(appFirstOption, openUrl),
    ).rejects.toThrow("unavailable");
    expect(openUrl).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildNavigationCandidates,
  buildNavigationValidationHtml,
} from "./generate-navigation-validation.js";
import type { ValidationPoint } from "./generate-navigation-validation.js";

const confirmedPoint: ValidationPoint = {
  id: "beijing-national-convention-center",
  city: "Beijing",
  cityZh: "北京",
  name: "China National Convention Center",
  nameZh: "国家会议中心",
  wgs84: [116.3838387, 39.9984707],
  coordinateSource: "human-confirmed fixture",
  entranceDescription: "Main vehicle entrance",
  confirmed: true,
  confirmedBy: "tester",
  confirmedAt: "2026-07-23",
};

describe("M0-T9 navigation candidate generator", () => {
  it("generates every provider/platform coordinate candidate without selecting one", () => {
    const candidates = buildNavigationCandidates(confirmedPoint.wgs84);

    expect(candidates).toHaveLength(16);
    expect(
      candidates.map(
        ({ platform, provider, coordinateMode }) =>
          `${platform}:${provider}:${coordinateMode}`,
      ),
    ).toEqual([
      "ios:apple:wgs84",
      "ios:apple:gcj02",
      "ios:google:wgs84",
      "ios:google:gcj02",
      "ios:amap:wgs84",
      "ios:amap:gcj02",
      "ios:baidu:wgs84",
      "ios:baidu:gcj02",
      "ios:baidu:bd09ll",
      "android:google:wgs84",
      "android:google:gcj02",
      "android:amap:wgs84",
      "android:amap:gcj02",
      "android:baidu:wgs84",
      "android:baidu:gcj02",
      "android:baidu:bd09ll",
    ]);
  });

  it("uses provider-specific coordinate order and offset flags", () => {
    const candidates = buildNavigationCandidates(
      confirmedPoint.wgs84,
      confirmedPoint.nameZh,
    );
    const appleWgs84 = candidates.find(
      (candidate) =>
        candidate.provider === "apple" && candidate.coordinateMode === "wgs84",
    );
    const amapWgs84 = candidates.find(
      (candidate) =>
        candidate.provider === "amap" &&
        candidate.platform === "ios" &&
        candidate.coordinateMode === "wgs84",
    );
    const amapGcj02 = candidates.find(
      (candidate) =>
        candidate.provider === "amap" &&
        candidate.platform === "ios" &&
        candidate.coordinateMode === "gcj02",
    );

    expect(appleWgs84?.primaryUrl).toContain("daddr=39.998471%2C116.383839");
    expect(amapWgs84?.primaryUrl).toContain("iosamap://path");
    expect(amapWgs84?.primaryUrl).toContain("dlat=39.998471");
    expect(amapWgs84?.primaryUrl).toContain("dlon=116.383839");
    expect(amapWgs84?.primaryUrl).toContain(
      "dname=%E5%9B%BD%E5%AE%B6%E4%BC%9A%E8%AE%AE%E4%B8%AD%E5%BF%83",
    );
    expect(amapWgs84?.primaryUrl).toContain("dev=1");
    expect(amapGcj02?.primaryUrl).toContain("dev=0");
  });

  it("opens route planning instead of forcing live navigation", () => {
    const candidates = buildNavigationCandidates(confirmedPoint.wgs84);

    expect(
      candidates.find((candidate) => candidate.provider === "google")
        ?.primaryUrl,
    ).not.toContain("dir_action=navigate");
    expect(
      candidates.find(
        (candidate) =>
          candidate.provider === "baidu" &&
          candidate.platform === "ios" &&
          candidate.coordinateMode === "wgs84",
      )?.primaryUrl,
    ).toContain("baidumap://map/direction");
    expect(
      candidates.find(
        (candidate) =>
          candidate.provider === "amap" &&
          candidate.platform === "android" &&
          candidate.coordinateMode === "wgs84",
      )?.primaryUrl,
    ).toContain("amapuri://route/plan/");
  });

  it("uses the verified Baidu marker page as the web fallback", () => {
    const candidate = buildNavigationCandidates(
      confirmedPoint.wgs84,
      confirmedPoint.nameZh,
    ).find(
      ({ platform, provider, coordinateMode }) =>
        platform === "android" &&
        provider === "baidu" &&
        coordinateMode === "wgs84",
    );

    expect(candidate?.fallbackUrl).toContain("http://api.map.baidu.com/marker");
    expect(candidate?.fallbackUrl).toContain("location=39.998471%2C116.383839");
    expect(candidate?.fallbackUrl).toContain(
      "title=%E5%9B%BD%E5%AE%B6%E4%BC%9A%E8%AE%AE%E4%B8%AD%E5%BF%83",
    );
    expect(candidate?.fallbackUrl).not.toContain("origin=");
  });

  it("refuses to produce a formal page from an unconfirmed entrance", () => {
    expect(() =>
      buildNavigationValidationHtml([{ ...confirmedPoint, confirmed: false }]),
    ).toThrow(/unconfirmed coordinates/);

    expect(() =>
      buildNavigationValidationHtml([{ ...confirmedPoint, confirmedAt: null }]),
    ).toThrow(/unconfirmed coordinates/);
  });

  it("marks an explicitly requested unconfirmed preview", () => {
    const html = buildNavigationValidationHtml(
      [{ ...confirmedPoint, confirmed: false }],
      true,
    );

    expect(html).toContain("Preview only");
    expect(html).toContain("NO — PREVIEW ONLY");
    expect(html).toContain("Open app candidate");
    expect(html).toContain("Open web fallback");
  });
});

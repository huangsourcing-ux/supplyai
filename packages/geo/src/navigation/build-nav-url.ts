import type { Gcj02Position, Wgs84Position } from "../coordinates.js";
import type {
  NavigationLink,
  NavigationTarget,
  NavigationUrls,
} from "./types.js";

const SOURCE_APPLICATION = "ChinaSupply.AI";
const SOURCE_IDENTIFIER = "chinasupply.ai";

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function latitudeLongitudeValue(position: Readonly<Wgs84Position>): string {
  const [longitude, latitude] = position;

  return `${formatCoordinate(latitude)},${formatCoordinate(longitude)}`;
}

function longitudeLatitudeValue(position: Readonly<Wgs84Position>): string {
  const [longitude, latitude] = position;

  return `${formatCoordinate(longitude)},${formatCoordinate(latitude)}`;
}

function buildUrl(
  base: string,
  parameters: ReadonlyArray<readonly [string, string]>,
): string {
  const url = new URL(base);

  for (const [name, value] of parameters) {
    url.searchParams.set(name, value);
  }

  return url.toString();
}

function wgs84Link(url: string): NavigationLink {
  return {
    coordinateMode: "wgs84",
    url,
  };
}

function buildAppleUrls(wgs84: Readonly<Wgs84Position>): NavigationUrls {
  const url = buildUrl("https://maps.apple.com/", [
    ["daddr", latitudeLongitudeValue(wgs84)],
    ["dirflg", "d"],
  ]);

  return {
    app: wgs84Link(url),
    webFallback: wgs84Link(url),
  };
}

function buildGoogleUrls(wgs84: Readonly<Wgs84Position>): NavigationUrls {
  const url = buildUrl("https://www.google.com/maps/dir/", [
    ["api", "1"],
    ["destination", latitudeLongitudeValue(wgs84)],
    ["travelmode", "driving"],
  ]);

  return {
    app: wgs84Link(url),
    webFallback: wgs84Link(url),
  };
}

function buildAmapUrls(
  target: Extract<NavigationTarget, { provider: "amap" }>,
  wgs84: Readonly<Wgs84Position>,
): NavigationUrls {
  const [longitude, latitude] = wgs84;
  const appUrl = buildUrl(
    target.platform === "ios" ? "iosamap://path" : "amapuri://route/plan/",
    [
      ["sourceApplication", SOURCE_APPLICATION],
      ["sid", ""],
      ["slat", ""],
      ["slon", ""],
      ["sname", ""],
      ["did", ""],
      ["dlat", formatCoordinate(latitude)],
      ["dlon", formatCoordinate(longitude)],
      ["dname", target.destinationName],
      ["dev", "1"],
      ["t", "0"],
    ],
  );
  const webFallbackUrl = buildUrl("https://uri.amap.com/navigation", [
    ["from", ""],
    ["to", `${longitudeLatitudeValue(wgs84)},${target.destinationName}`],
    ["mode", "car"],
    ["policy", "0"],
    ["src", SOURCE_IDENTIFIER],
    ["callnative", "0"],
  ]);

  return {
    app: wgs84Link(appUrl),
    webFallback: wgs84Link(webFallbackUrl),
  };
}

function buildBaiduUrls(
  target: Extract<NavigationTarget, { provider: "baidu" }>,
  wgs84: Readonly<Wgs84Position>,
): NavigationUrls {
  const source =
    target.platform === "ios"
      ? `ios.${SOURCE_IDENTIFIER}`
      : `andr.${SOURCE_IDENTIFIER}`;
  const appUrl = buildUrl("baidumap://map/direction", [
    ["origin", "我的位置"],
    [
      "destination",
      `name:${target.destinationName}|latlng:${latitudeLongitudeValue(wgs84)}`,
    ],
    ["mode", "driving"],
    ["coord_type", "wgs84"],
    ["src", source],
  ]);
  const webFallbackUrl = buildUrl("http://api.map.baidu.com/marker", [
    ["location", latitudeLongitudeValue(wgs84)],
    ["title", target.destinationName],
    ["content", target.destinationName],
    ["coord_type", "wgs84"],
    ["output", "html"],
    ["src", `webapp.${SOURCE_IDENTIFIER}`],
  ]);

  return {
    app: wgs84Link(appUrl),
    webFallback: wgs84Link(webFallbackUrl),
  };
}

export function buildNavUrl(
  target: NavigationTarget,
  wgs84: Readonly<Wgs84Position>,
  gcj02?: Readonly<Gcj02Position>,
): NavigationUrls {
  // M0-T9 verified WGS-84 for every current target. Keep the original GCJ-02
  // input in the public contract so a future, separately verified rule can use
  // it without forcing callers to discard source coordinates.
  void gcj02;

  switch (target.provider) {
    case "apple":
      return buildAppleUrls(wgs84);
    case "google":
      return buildGoogleUrls(wgs84);
    case "amap":
      return buildAmapUrls(target, wgs84);
    case "baidu":
      return buildBaiduUrls(target, wgs84);
  }
}

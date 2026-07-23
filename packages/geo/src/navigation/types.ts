import type { Wgs84Position } from "../coordinates.js";

export type NavigationProvider = "amap" | "apple" | "baidu" | "google";
export type NavigationPlatform = "android" | "ios";
export type NavigationCoordinateMode = "bd09ll" | "gcj02" | "wgs84";

interface NavigationTargetBase {
  destinationName: string;
}

type IosNavigationTarget<Provider extends NavigationProvider> =
  NavigationTargetBase & {
    platform: "ios";
    provider: Provider;
  };

type AndroidNavigationTarget<
  Provider extends Exclude<NavigationProvider, "apple">,
> = NavigationTargetBase & {
  platform: "android";
  provider: Provider;
};

export type NavigationTarget =
  | IosNavigationTarget<"apple">
  | IosNavigationTarget<"google">
  | IosNavigationTarget<"amap">
  | IosNavigationTarget<"baidu">
  | AndroidNavigationTarget<"google">
  | AndroidNavigationTarget<"amap">
  | AndroidNavigationTarget<"baidu">;

export interface NavigationLink {
  coordinateMode: NavigationCoordinateMode;
  url: string;
}

export interface NavigationUrls {
  app: NavigationLink;
  webFallback: NavigationLink;
}

export interface NavigationValidationFixture {
  city: string;
  cityZh: string;
  destinationName: string;
  entranceDescription: string;
  id: string;
  wgs84: Wgs84Position;
}

import { getMobileIdentity, type MobileEnvironment } from "./app-identity";

export type MobilePlatform = "android" | "ios";

export interface MapTilerRequestIdentity {
  key: string;
  userAgent: string;
}

interface MapTilerKeys {
  android: string;
  ios: string;
}

export function getMapTilerRequestIdentity(
  environment: MobileEnvironment,
  platform: MobilePlatform,
  keys: MapTilerKeys,
): MapTilerRequestIdentity {
  const identity = getMobileIdentity(environment);

  return platform === "ios"
    ? {
        key: keys.ios,
        userAgent: `ChinaSupplyAI-iOS/${identity.bundleIdentifier}`,
      }
    : {
        key: keys.android,
        userAgent: `ChinaSupplyAI-Android/${identity.androidPackage}`,
      };
}

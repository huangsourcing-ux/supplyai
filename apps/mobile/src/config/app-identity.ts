export type MobileEnvironment = "local" | "staging" | "production";

export interface MobileIdentity {
  androidPackage: string;
  bundleIdentifier: string;
  name: string;
  scheme: string;
}

const identities = {
  local: {
    androidPackage: "ai.chinasupply.app.local",
    bundleIdentifier: "ai.chinasupply.app.local",
    name: "ChinaSupply.AI Local",
    scheme: "chinasupply.local",
  },
  staging: {
    androidPackage: "ai.chinasupply.app.staging",
    bundleIdentifier: "ai.chinasupply.app.staging",
    name: "ChinaSupply.AI Staging",
    scheme: "chinasupply.staging",
  },
  production: {
    androidPackage: "ai.chinasupply.mobile",
    bundleIdentifier: "ai.chinasupply.mobile",
    name: "ChinaSupply.AI",
    scheme: "chinasupply",
  },
} as const satisfies Record<MobileEnvironment, MobileIdentity>;

export function getMobileIdentity(
  environment: MobileEnvironment,
): MobileIdentity {
  return identities[environment];
}

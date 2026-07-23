import type { ConfigContext, ExpoConfig } from "@expo/config";

import "tsx/cjs";

import { createMobileExpoConfig } from "./src/config/expo-config";
import { mobileEnvironment } from "./src/env";

export function createExpoConfig({ config }: ConfigContext): ExpoConfig {
  return createMobileExpoConfig(mobileEnvironment.EXPO_PUBLIC_APP_ENV, config);
}

export default createExpoConfig;

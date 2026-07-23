import type { ConfigContext, ExpoConfig } from "@expo/config";

import "tsx/cjs";

import { createMobileExpoConfig } from "./src/config/expo-config";
import { buildMobileEnvironment } from "./src/env";

export function createExpoConfig({ config }: ConfigContext): ExpoConfig {
  const environment = buildMobileEnvironment(process.env);

  return createMobileExpoConfig(environment.EXPO_PUBLIC_APP_ENV, config);
}

export default createExpoConfig;

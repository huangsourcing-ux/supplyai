import type { ConfigContext, ExpoConfig } from "@expo/config";

import "tsx/cjs";

import {
  createMobileExpoConfig,
  resolveMobileSentryBuildConfig,
} from "./src/config/expo-config";
import { buildMobileEnvironment } from "./src/env";

export function createExpoConfig({ config }: ConfigContext): ExpoConfig {
  const environment = buildMobileEnvironment({
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    EXPO_PUBLIC_MAPTILER_KEY: process.env.EXPO_PUBLIC_MAPTILER_KEY,
    EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_SENTRY_SMOKE_ENABLED:
      process.env.EXPO_PUBLIC_SENTRY_SMOKE_ENABLED,
  });
  const sentryBuildConfig = resolveMobileSentryBuildConfig(
    process.env,
    environment.EXPO_PUBLIC_APP_ENV,
  );

  return createMobileExpoConfig(
    environment.EXPO_PUBLIC_APP_ENV,
    config,
    sentryBuildConfig,
  );
}

export default createExpoConfig;

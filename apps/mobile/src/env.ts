import { parseMobileEnv } from "@chinasupply/config/env/mobile";

const localDefaults = {
  EXPO_PUBLIC_APP_ENV: "local",
  EXPO_PUBLIC_API_BASE_URL: "http://localhost:3001/api/v1",
  EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED: "false",
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_replace_me",
  EXPO_PUBLIC_MAPTILER_IOS_KEY: "replace_me_ios",
  EXPO_PUBLIC_MAPTILER_ANDROID_KEY: "replace_me_android",
  EXPO_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
  EXPO_PUBLIC_SENTRY_SMOKE_ENABLED: "false",
  EXPO_PUBLIC_POSTHOG_KEY: "phc_replace_me",
  EXPO_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
} as const;

const requiredVariableNames = [
  "EXPO_PUBLIC_APP_ENV",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

const optionalVariableNames = [
  "EXPO_PUBLIC_MAPTILER_IOS_KEY",
  "EXPO_PUBLIC_MAPTILER_ANDROID_KEY",
  "EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED",
  "EXPO_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_SENTRY_SMOKE_ENABLED",
  "EXPO_PUBLIC_POSTHOG_KEY",
  "EXPO_PUBLIC_POSTHOG_HOST",
] as const;

export function buildMobileEnvironment(
  source: Record<string, string | undefined>,
) {
  const appEnvironment = source.EXPO_PUBLIC_APP_ENV ?? "local";
  const environment = Object.fromEntries(
    requiredVariableNames.map((name) => [
      name,
      source[name] ?? localDefaults[name],
    ]),
  );

  for (const name of optionalVariableNames) {
    const value =
      source[name] ??
      (appEnvironment === "local" ? localDefaults[name] : undefined);

    if (value !== undefined) {
      environment[name] = value;
    }
  }

  for (const [name, value] of Object.entries(source)) {
    if (!name.startsWith("EXPO_PUBLIC_") && value !== undefined) {
      environment[name] = value;
    }
  }

  return parseMobileEnv(environment);
}

export const mobileEnvironment = buildMobileEnvironment({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED:
    process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  EXPO_PUBLIC_MAPTILER_IOS_KEY: process.env.EXPO_PUBLIC_MAPTILER_IOS_KEY,
  EXPO_PUBLIC_MAPTILER_ANDROID_KEY:
    process.env.EXPO_PUBLIC_MAPTILER_ANDROID_KEY,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_SENTRY_SMOKE_ENABLED:
    process.env.EXPO_PUBLIC_SENTRY_SMOKE_ENABLED,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
});

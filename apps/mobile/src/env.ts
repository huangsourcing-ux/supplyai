import { parseMobileEnv } from "@chinasupply/config/env/mobile";

const localDefaults = {
  EXPO_PUBLIC_APP_ENV: "local",
  EXPO_PUBLIC_API_BASE_URL: "http://localhost:3001/api/v1",
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_replace_me",
  EXPO_PUBLIC_MAPTILER_KEY: "replace_me",
  EXPO_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
  EXPO_PUBLIC_POSTHOG_KEY: "phc_replace_me",
  EXPO_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
} as const;

const publicVariableNames = Object.keys(localDefaults) as Array<
  keyof typeof localDefaults
>;

export function buildMobileEnvironment(
  source: Record<string, string | undefined>,
) {
  const environment = Object.fromEntries(
    publicVariableNames.map((name) => [
      name,
      source[name] ?? localDefaults[name],
    ]),
  );

  for (const [name, value] of Object.entries(source)) {
    if (!name.startsWith("EXPO_PUBLIC_") && value !== undefined) {
      environment[name] = value;
    }
  }

  return parseMobileEnv(environment);
}

export const mobileEnvironment = buildMobileEnvironment(process.env);

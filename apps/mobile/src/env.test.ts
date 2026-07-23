import { buildMobileEnvironment } from "./env";

describe("mobile environment", () => {
  it("uses safe local defaults for static tooling", () => {
    expect(buildMobileEnvironment({}).EXPO_PUBLIC_APP_ENV).toBe("local");
  });

  it("rejects private server variables", () => {
    expect(() =>
      buildMobileEnvironment({ DATABASE_URL: "postgresql://private" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("requires Sentry while other deferred integrations remain optional", () => {
    const staging = {
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com/api/v1",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "pk_test_c3RhZ2luZy5jbGVyay5hY2NvdW50cy5kZXYk",
    };

    expect(() => buildMobileEnvironment(staging)).toThrow(
      /EXPO_PUBLIC_SENTRY_DSN/,
    );

    const environment = buildMobileEnvironment({
      ...staging,
      EXPO_PUBLIC_SENTRY_DSN: "https://public@o1.ingest.sentry.io/123456789",
    });

    expect(environment.EXPO_PUBLIC_MAPTILER_KEY).toBeUndefined();
    expect(environment.EXPO_PUBLIC_SENTRY_DSN).toContain("ingest.sentry.io");
    expect(environment.EXPO_PUBLIC_POSTHOG_KEY).toBeUndefined();
  });

  it("still rejects supplied placeholders and incomplete PostHog pairs", () => {
    const staging = {
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com/api/v1",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "pk_test_c3RhZ2luZy5jbGVyay5hY2NvdW50cy5kZXYk",
      EXPO_PUBLIC_SENTRY_DSN: "https://public@o1.ingest.sentry.io/123456789",
    };

    expect(() =>
      buildMobileEnvironment({
        ...staging,
        EXPO_PUBLIC_MAPTILER_KEY: "replace_me",
      }),
    ).toThrow(/EXPO_PUBLIC_MAPTILER_KEY/);
    expect(() =>
      buildMobileEnvironment({
        ...staging,
        EXPO_PUBLIC_POSTHOG_KEY: "phc_actual_public_key",
      }),
    ).toThrow(/EXPO_PUBLIC_POSTHOG_HOST/);
  });
});

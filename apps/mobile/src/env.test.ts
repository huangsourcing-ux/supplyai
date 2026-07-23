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

  it("allows deferred integrations to be absent in staging", () => {
    const environment = buildMobileEnvironment({
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com/api/v1",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "pk_test_c3RhZ2luZy5jbGVyay5hY2NvdW50cy5kZXYk",
    });

    expect(environment.EXPO_PUBLIC_MAPTILER_KEY).toBeUndefined();
    expect(environment.EXPO_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(environment.EXPO_PUBLIC_POSTHOG_KEY).toBeUndefined();
  });

  it("still rejects supplied placeholders and incomplete PostHog pairs", () => {
    const staging = {
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com/api/v1",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "pk_test_c3RhZ2luZy5jbGVyay5hY2NvdW50cy5kZXYk",
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

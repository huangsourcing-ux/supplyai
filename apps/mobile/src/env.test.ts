import { buildMobileEnvironment } from "./env";

describe("mobile environment", () => {
  it("uses safe local defaults for static tooling", () => {
    const environment = buildMobileEnvironment({});

    expect(environment.EXPO_PUBLIC_APP_ENV).toBe("local");
    expect(environment.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED).toBe("false");
  });

  it.each([undefined, "false"])(
    "refuses a production build when native Apple sign-in is %s",
    (appleSignInEnabled) => {
      expect(() =>
        buildMobileEnvironment({
          EXPO_PUBLIC_APP_ENV: "production",
          EXPO_PUBLIC_API_BASE_URL: "https://api.chinasupply.ai/api/v1",
          EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED: appleSignInEnabled,
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
            "pk_live_cHJvZHVjdGlvbi5jbGVyay5hY2NvdW50cy5kZXYk",
          EXPO_PUBLIC_MAPTILER_ANDROID_KEY: "android_actual_public_key",
          EXPO_PUBLIC_MAPTILER_IOS_KEY: "ios_actual_public_key",
          EXPO_PUBLIC_SENTRY_DSN:
            "https://public@o1.ingest.sentry.io/123456789",
        }),
      ).toThrow(/EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED/);
    },
  );

  it("refuses an incomplete production EAS environment instead of using local defaults", () => {
    expect(() =>
      buildMobileEnvironment({
        EXPO_PUBLIC_APP_ENV: "production",
      }),
    ).toThrow(
      /EXPO_PUBLIC_API_BASE_URL.*EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED.*EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY/,
    );
  });

  it("rejects private server variables", () => {
    expect(() =>
      buildMobileEnvironment({ DATABASE_URL: "postgresql://private" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("requires MapTiler platform keys and Sentry outside local", () => {
    const staging = {
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com/api/v1",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "pk_test_c3RhZ2luZy5jbGVyay5hY2NvdW50cy5kZXYk",
    };

    expect(() => buildMobileEnvironment(staging)).toThrow(
      /EXPO_PUBLIC_MAPTILER_IOS_KEY/,
    );

    const environment = buildMobileEnvironment({
      ...staging,
      EXPO_PUBLIC_MAPTILER_IOS_KEY: "ios_actual_public_key",
      EXPO_PUBLIC_MAPTILER_ANDROID_KEY: "android_actual_public_key",
      EXPO_PUBLIC_SENTRY_DSN: "https://public@o1.ingest.sentry.io/123456789",
    });

    expect(environment.EXPO_PUBLIC_MAPTILER_IOS_KEY).toBe(
      "ios_actual_public_key",
    );
    expect(environment.EXPO_PUBLIC_MAPTILER_ANDROID_KEY).toBe(
      "android_actual_public_key",
    );
    expect(environment.EXPO_PUBLIC_SENTRY_DSN).toContain("ingest.sentry.io");
    expect(environment.EXPO_PUBLIC_POSTHOG_KEY).toBeUndefined();
  });

  it("still rejects supplied placeholders and incomplete PostHog pairs", () => {
    const staging = {
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com/api/v1",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "pk_test_c3RhZ2luZy5jbGVyay5hY2NvdW50cy5kZXYk",
      EXPO_PUBLIC_MAPTILER_IOS_KEY: "ios_actual_public_key",
      EXPO_PUBLIC_MAPTILER_ANDROID_KEY: "android_actual_public_key",
      EXPO_PUBLIC_SENTRY_DSN: "https://public@o1.ingest.sentry.io/123456789",
    };

    expect(() =>
      buildMobileEnvironment({
        ...staging,
        EXPO_PUBLIC_MAPTILER_IOS_KEY: "replace_me",
      }),
    ).toThrow(/EXPO_PUBLIC_MAPTILER_IOS_KEY/);
    expect(() =>
      buildMobileEnvironment({
        ...staging,
        EXPO_PUBLIC_POSTHOG_KEY: "phc_actual_public_key",
      }),
    ).toThrow(/EXPO_PUBLIC_POSTHOG_HOST/);
  });
});

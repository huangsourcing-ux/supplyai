import { afterEach, describe, expect, it } from "vitest";

import { createWebSentryOptions } from "../monitoring/sentry-options";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("Web Sentry options", () => {
  it("maps the frozen app environments and keeps the injected release", () => {
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    process.env.NEXT_PUBLIC_SENTRY_DSN =
      "https://public@o1.ingest.sentry.io/123456789";
    process.env.NEXT_PUBLIC_SENTRY_RELEASE =
      "chinasupply-web@0.0.0+abcdef123456";

    expect(createWebSentryOptions()).toMatchObject({
      enabled: true,
      environment: "staging",
      release: "chinasupply-web@0.0.0+abcdef123456",
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
  });

  it("disables the local placeholder DSN", () => {
    process.env.NEXT_PUBLIC_APP_ENV = "local";
    process.env.NEXT_PUBLIC_SENTRY_DSN =
      "https://public@example.ingest.sentry.io/1";

    expect(createWebSentryOptions()).toMatchObject({
      enabled: false,
      environment: "dev",
    });
  });
});

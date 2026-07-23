import { describe, expect, it } from "vitest";

import { apiSentryEnvironment, apiSentryRelease } from "../src/instrument.js";
import { createApiSentrySmokeError } from "../src/monitoring/sentry-smoke-error.js";

describe("API Sentry configuration", () => {
  it("uses the dev environment and a deterministic local release", () => {
    expect(apiSentryEnvironment).toBe("dev");
    expect(apiSentryRelease).toMatch(/^chinasupply-api@0\.0\.0\+/);
    expect(createApiSentrySmokeError().message).toBe(
      "M0-T7 API Sentry smoke test",
    );
  });
});

import { describe, expect, it } from "vitest";

import { parsePayloadEnv } from "../env/payload-schema";

const localEnvironment = {
  APP_ENV: "local",
  DATABASE_URL: "postgresql://user:password@127.0.0.1:5432/database",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  PAYLOAD_SECRET: "local_secret_that_is_at_least_32_characters",
};

describe("Payload release environment", () => {
  it("accepts the isolated local migration values", () => {
    expect(parsePayloadEnv(localEnvironment).APP_ENV).toBe("local");
  });

  it("rejects local URLs and placeholders outside local without leaking values", () => {
    const secret = "replace_me_with_a_real_staging_secret";

    expect(() =>
      parsePayloadEnv({
        ...localEnvironment,
        APP_ENV: "staging",
        PAYLOAD_SECRET: secret,
      }),
    ).toThrowError(
      expect.objectContaining({
        message: expect.not.stringContaining(secret),
      }),
    );

    expect(() =>
      parsePayloadEnv({
        ...localEnvironment,
        APP_ENV: "staging",
        PAYLOAD_SECRET: secret,
      }),
    ).toThrow(/DATABASE_URL, NEXT_PUBLIC_SITE_URL, PAYLOAD_SECRET/);
  });
});

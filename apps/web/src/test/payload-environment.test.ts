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
    const parsed = parsePayloadEnv(localEnvironment);
    expect(parsed.APP_ENV).toBe("local");
    expect(parsed.R2_ACCOUNT_ID).toBeUndefined();
  });

  it("requires a complete CMS media configuration when any R2 value is set", () => {
    expect(() =>
      parsePayloadEnv({ ...localEnvironment, R2_ACCOUNT_ID: "local-account" }),
    ).toThrow(/R2_ACCESS_KEY_ID/);

    expect(
      parsePayloadEnv({
        ...localEnvironment,
        R2_ACCESS_KEY_ID: "local-access-key",
        R2_ACCOUNT_ID: "local-account",
        R2_CDN_BASE_URL: "http://localhost:9000",
        R2_MEDIA_BUCKET: "local-media",
        R2_PREFIX: "dev",
        R2_SECRET_ACCESS_KEY: "local-secret-key",
      }).R2_PREFIX,
    ).toBe("dev");

    expect(() =>
      parsePayloadEnv({
        ...localEnvironment,
        R2_ACCESS_KEY_ID: "local-access-key",
        R2_ACCOUNT_ID: "local-account",
        R2_CDN_BASE_URL: "http://localhost:9000",
        R2_MEDIA_BUCKET: "local-media",
        R2_PREFIX: "staging",
        R2_SECRET_ACCESS_KEY: "local-secret-key",
      }),
    ).toThrow(/R2_PREFIX/);

    expect(() =>
      parsePayloadEnv({
        APP_ENV: "staging",
        DATABASE_URL:
          "postgresql://staging:password@db.example.com:5432/chinasupply",
        NEXT_PUBLIC_SITE_URL: "https://staging.chinasupply.ai",
        PAYLOAD_SECRET: "staging_payload_secret_at_least_32_chars",
        R2_ACCESS_KEY_ID: "staging-access-key",
        R2_ACCOUNT_ID: "staging-account",
        R2_CDN_BASE_URL: "https://cdn-staging.chinasupply.ai",
        R2_ENDPOINT: "https://minio.example.com",
        R2_MEDIA_BUCKET: "chinasupply-staging-media",
        R2_PREFIX: "staging",
        R2_SECRET_ACCESS_KEY: "staging-secret-key",
      }),
    ).toThrow(/R2_ENDPOINT/);
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

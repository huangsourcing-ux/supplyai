import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

import {
  parseClerkUserSyncCliEnv,
  parseApiEnv,
  parseApiHttpEnv,
  parseApiRuntimeEnv,
  parseImportCliEnv,
  parsePrivateObjectStorageEnv,
  parseSeedCliEnv,
} from "../env/api.js";
import { parseMobileEnv } from "../env/mobile.js";
import {
  createSentryRelease,
  isSentryDsnConfigured,
  toSentryEnvironment,
} from "../env/sentry.js";
import { parseWebEnv } from "../env/web.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(testDirectory, "../../..");

/**
 * @param {string} relativePath
 * @returns {Promise<Record<string, string>>}
 */
async function readExample(relativePath) {
  return parseEnv(await readFile(resolve(workspaceRoot, relativePath), "utf8"));
}

test("all application examples pass their local schemas", async () => {
  const [api, web, mobile] = await Promise.all([
    readExample("apps/api/.env.example"),
    readExample("apps/web/.env.example"),
    readExample("apps/mobile/.env.example"),
  ]);

  assert.equal(parseApiEnv(api).APP_ENV, "local");
  assert.equal(parseWebEnv(web).NEXT_PUBLIC_APP_ENV, "local");
  assert.equal(parseMobileEnv(mobile).EXPO_PUBLIC_APP_ENV, "local");
});

test("API validation reports fields without leaking secret values", async () => {
  const api = await readExample("apps/api/.env.example");
  const secret = "never-print-this-secret";

  assert.throws(
    () =>
      parseApiEnv({
        ...api,
        PORT: "0",
        DATABASE_URL: undefined,
        R2_SECRET_ACCESS_KEY: secret,
      }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /DATABASE_URL/);
      assert.match(error.message, /PORT/);
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});

test("remote API environments reject local URLs and cross-environment R2 prefixes", async () => {
  const api = await readExample("apps/api/.env.example");

  assert.throws(
    () =>
      parseApiEnv({
        ...api,
        APP_ENV: "staging",
        R2_PREFIX: "dev",
      }),
    /API environment validation failed/,
  );
});

test("API environment keeps public media and private operations in separate buckets", async () => {
  const api = await readExample("apps/api/.env.example");

  assert.throws(
    () =>
      parseApiEnv({
        ...api,
        R2_PRIVATE_BUCKET: api.R2_MEDIA_BUCKET,
      }),
    /R2_PRIVATE_BUCKET/,
  );
});

test("private R2 endpoint overrides are local-only", async () => {
  const api = await readExample("apps/api/.env.example");
  assert.equal(
    parsePrivateObjectStorageEnv({
      ...api,
      R2_ENDPOINT: "http://127.0.0.1:9000",
    }).R2_ENDPOINT,
    "http://127.0.0.1:9000",
  );
  assert.equal(parseImportCliEnv(api).REDIS_URL, api.REDIS_URL);
  assert.equal(parseSeedCliEnv(api).DATABASE_URL, api.DATABASE_URL);
  assert.throws(
    () =>
      parsePrivateObjectStorageEnv({
        ...api,
        APP_ENV: "staging",
        R2_PREFIX: "staging",
        R2_ACCOUNT_ID: "real-staging-account",
        R2_ACCESS_KEY_ID: "real-staging-access",
        R2_SECRET_ACCESS_KEY: "real-staging-secret",
        R2_PRIVATE_BUCKET: "chinasupply-staging",
        R2_ENDPOINT: "https://minio.example.test",
      }),
    /R2_ENDPOINT/,
  );
});

test("Clerk user sync CLI validates only its scoped credentials", async () => {
  const api = await readExample("apps/api/.env.example");

  assert.equal(parseClerkUserSyncCliEnv(api).APP_ENV, "local");
  assert.equal(
    parseClerkUserSyncCliEnv({
      APP_ENV: "staging",
      CLERK_SECRET_KEY: "sk_test_staging_sync_key_123456",
      DATABASE_URL: "postgresql://user:pass@db.staging.invalid/chinasupply",
    }).APP_ENV,
    "staging",
  );
  assert.throws(
    () =>
      parseClerkUserSyncCliEnv({
        APP_ENV: "staging",
        CLERK_SECRET_KEY: "sk_live_wrong_environment_123456",
        DATABASE_URL: api.DATABASE_URL,
      }),
    /Clerk user sync CLI environment validation failed: CLERK_SECRET_KEY, DATABASE_URL/,
  );
});

test("staging rejects provider placeholder values", async () => {
  const api = await readExample("apps/api/.env.example");

  assert.throws(
    () =>
      parseApiEnv({
        ...api,
        APP_ENV: "staging",
        DATABASE_URL: "postgresql://user:pass@db.staging.invalid/chinasupply",
        REDIS_URL: "redis://redis.staging.invalid:6379",
        WEB_ORIGIN: "https://staging.invalid",
        R2_PREFIX: "staging",
        R2_CDN_BASE_URL: "https://cdn.staging.invalid",
      }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /CLERK_SECRET_KEY/);
      assert.match(error.message, /CLERK_WEBHOOK_SECRET/);
      assert.match(error.message, /SENTRY_DSN/);
      return true;
    },
  );
});

test("API runtime validation requires current dependencies without future providers", async () => {
  const api = await readExample("apps/api/.env.example");
  const runtimeOnly = {
    APP_ENV: "staging",
    PORT: api.PORT,
    DATABASE_URL: "postgresql://user:pass@db.staging.invalid/chinasupply",
    REDIS_URL: "redis://redis.staging.invalid:6379",
    R2_CDN_BASE_URL: "https://cdn.staging.invalid",
    SENTRY_DSN: "https://public@o1.ingest.sentry.io/1",
    SENTRY_RELEASE: "chinasupply-api@0.0.0+test",
    WEB_ORIGIN: "https://staging.invalid",
  };

  assert.equal(parseApiRuntimeEnv(runtimeOnly).APP_ENV, "staging");
  assert.throws(
    () => parseApiRuntimeEnv({ ...runtimeOnly, REDIS_URL: api.REDIS_URL }),
    /API runtime environment validation failed: REDIS_URL/,
  );
});

test("remote API HTTP validation requires a non-placeholder edge secret", async () => {
  const runtimeOnly = {
    APP_ENV: "staging",
    PORT: "3001",
    CLERK_SECRET_KEY: "sk_test_runtime_key_123456",
    DATABASE_URL: "postgresql://user:pass@db.staging.invalid/chinasupply",
    REDIS_URL: "redis://redis.staging.invalid:6379",
    R2_CDN_BASE_URL: "https://cdn.staging.invalid",
    SENTRY_DSN: "https://public@o1.ingest.sentry.io/1",
    SENTRY_RELEASE: "chinasupply-api@0.0.0+test",
    WEB_ORIGIN: "https://staging.invalid",
  };

  assert.throws(
    () => parseApiHttpEnv(runtimeOnly),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /EDGE_PROXY_SECRET/);
      assert.match(error.message, /CLERK_WEBHOOK_SECRET/);
      assert.match(error.message, /CLOUDFLARE_ZONE_ID/);
      assert.match(error.message, /CLOUDFLARE_PURGE_TOKEN/);
      return true;
    },
  );
  assert.equal(
    parseApiHttpEnv({
      ...runtimeOnly,
      CLERK_WEBHOOK_SECRET: "whsec_c3RhZ2luZ193ZWJob29rX3Rlc3Rfc2VjcmV0",
      CLOUDFLARE_PURGE_TOKEN: "cache-purge-test-token",
      CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
      EDGE_PROXY_SECRET: "0123456789abcdef0123456789abcdef",
    }).APP_ENV,
    "staging",
  );
  assert.throws(
    () =>
      parseApiHttpEnv({
        ...runtimeOnly,
        CLERK_SECRET_KEY: undefined,
        CLERK_WEBHOOK_SECRET: "whsec_c3RhZ2luZ193ZWJob29rX3Rlc3Rfc2VjcmV0",
        CLOUDFLARE_PURGE_TOKEN: "cache-purge-test-token",
        CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
        EDGE_PROXY_SECRET: "0123456789abcdef0123456789abcdef",
      }),
    /CLERK_SECRET_KEY/,
  );
});

test("Sentry environment and release values are stable across applications", () => {
  assert.equal(toSentryEnvironment("local"), "dev");
  assert.equal(toSentryEnvironment("staging"), "staging");
  assert.equal(toSentryEnvironment("production"), "prod");
  assert.equal(
    createSentryRelease({
      component: "web",
      revision: "abcdef123456",
      version: "0.0.0",
    }),
    "chinasupply-web@0.0.0+abcdef123456",
  );
  assert.equal(
    createSentryRelease({
      component: "api",
      explicitRelease: "chinasupply-api@1.2.3+release",
      revision: "ignored",
      version: "0.0.0",
    }),
    "chinasupply-api@1.2.3+release",
  );
  assert.equal(
    isSentryDsnConfigured("https://public@o1.ingest.sentry.io/1"),
    true,
  );
  assert.equal(
    isSentryDsnConfigured("https://public@example.ingest.sentry.io/1"),
    false,
  );
});

test("production rejects test Clerk keys and Web environment mismatches", async () => {
  const web = await readExample("apps/web/.env.example");

  assert.throws(
    () =>
      parseWebEnv({
        ...web,
        APP_ENV: "production",
        NEXT_PUBLIC_APP_ENV: "staging",
        R2_PREFIX: "",
      }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /CLERK_SECRET_KEY/);
      assert.match(error.message, /NEXT_PUBLIC_APP_ENV/);
      assert.match(error.message, /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
      return true;
    },
  );
});

test("mobile example contains public variables only", async () => {
  const mobile = await readExample("apps/mobile/.env.example");

  assert.ok(Object.keys(mobile).every((key) => key.startsWith("EXPO_PUBLIC_")));
  assert.throws(
    () => parseMobileEnv({ ...mobile, DATABASE_URL: "postgresql://private" }),
    /DATABASE_URL/,
  );
});

test("remote mobile environments require separate platform MapTiler keys", async () => {
  const mobile = await readExample("apps/mobile/.env.example");
  const staging = {
    ...mobile,
    EXPO_PUBLIC_APP_ENV: "staging",
    EXPO_PUBLIC_API_BASE_URL: "https://api-staging.chinasupply.ai/api/v1",
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
      "pk_test_c3RhZ2luZy5jbGVyay5hY2NvdW50cy5kZXYk",
    EXPO_PUBLIC_MAPTILER_IOS_KEY: "ios_staging_public_key",
    EXPO_PUBLIC_MAPTILER_ANDROID_KEY: "android_staging_public_key",
    EXPO_PUBLIC_SENTRY_DSN: "https://public@o1.ingest.sentry.io/123456789",
    EXPO_PUBLIC_POSTHOG_KEY: "phc_staging_public_key",
  };

  assert.equal(parseMobileEnv(staging).EXPO_PUBLIC_APP_ENV, "staging");
  assert.throws(
    () =>
      parseMobileEnv({
        ...staging,
        EXPO_PUBLIC_MAPTILER_IOS_KEY: undefined,
      }),
    /EXPO_PUBLIC_MAPTILER_IOS_KEY/,
  );
  assert.throws(
    () =>
      parseMobileEnv({
        ...staging,
        EXPO_PUBLIC_MAPTILER_ANDROID_KEY: undefined,
      }),
    /EXPO_PUBLIC_MAPTILER_ANDROID_KEY/,
  );
});

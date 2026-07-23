import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

import { parseApiEnv, parseApiRuntimeEnv } from "../env/api.js";
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

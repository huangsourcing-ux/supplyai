import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "../..");
const baseURL = "http://127.0.0.1:3100";

const fixtureEnvironment = {
  APP_ENV: "local",
  CLERK_SECRET_KEY: "sk_test_fixture_only_secret",
  DATABASE_URL:
    "postgresql://chinasupply:fixture_only@127.0.0.1:5432/chinasupply",
  NEXT_PUBLIC_API_BASE_URL: "https://api.fixture.invalid/api/v1",
  NEXT_PUBLIC_APP_ENV: "local",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZml4dHVyZS5pbnZhbGlkJA==",
  NEXT_PUBLIC_MAPTILER_KEY: "fixture_maptiler_key",
  NEXT_PUBLIC_POSTHOG_HOST: "https://posthog.fixture.invalid",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_fixture_only",
  NEXT_PUBLIC_SENTRY_DSN: "https://public@sentry.fixture.invalid/1",
  NEXT_PUBLIC_SITE_URL: baseURL,
  PAYLOAD_SECRET: "fixture_payload_secret_at_least_32_characters",
  PLAYWRIGHT_TEST: "1",
  R2_ACCESS_KEY_ID: "fixture_access_key",
  R2_ACCOUNT_ID: "fixture_account",
  R2_CDN_BASE_URL: "https://media.fixture.invalid",
  R2_MEDIA_BUCKET: "chinasupply-fixture-media",
  R2_PREFIX: "dev",
  R2_SECRET_ACCESS_KEY: "fixture_secret_key",
  SENTRY_AUTH_TOKEN: "fixture_sentry_token",
  SENTRY_ORG: "replace_me",
  SENTRY_PROJECT: "chinasupply-web",
} satisfies Record<string, string>;

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  forbidOnly: process.env.CI === "true",
  fullyParallel: false,
  outputDir: "test-results/fixture",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 720, width: 1280 },
      },
    },
  ],
  reporter: [
    ["line"],
    ["html", { open: "never", outputFolder: "playwright-report/fixture" }],
  ],
  retries: process.env.CI === "true" ? 1 : 0,
  testDir: "./e2e/fixture",
  testMatch: "**/*.spec.ts",
  timeout: 45_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm build --filter=@chinasupply/web && pnpm --filter @chinasupply/web exec next start --hostname 127.0.0.1 --port 3100",
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ...fixtureEnvironment,
    },
    reuseExistingServer: false,
    stderr: "pipe",
    stdout: "pipe",
    timeout: 180_000,
    url: baseURL,
  },
  workers: process.env.CI === "true" ? 1 : undefined,
});

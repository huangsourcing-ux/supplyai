import { defineConfig, devices } from "@playwright/test";

const configuredBaseURL =
  process.env.PLAYWRIGHT_STAGING_BASE_URL ?? "https://staging.chinasupply.ai";
const stagingBaseURL = new URL(configuredBaseURL);
const stagingOrigin = "https://staging.chinasupply.ai";

if (
  stagingBaseURL.origin !== stagingOrigin ||
  stagingBaseURL.pathname !== "/" ||
  stagingBaseURL.search !== "" ||
  stagingBaseURL.hash !== "" ||
  stagingBaseURL.username !== "" ||
  stagingBaseURL.password !== ""
) {
  throw new Error(
    "PLAYWRIGHT_STAGING_BASE_URL must target https://staging.chinasupply.ai",
  );
}

export default defineConfig({
  expect: {
    timeout: 15_000,
  },
  forbidOnly: true,
  fullyParallel: false,
  outputDir: "test-results/staging",
  projects: [
    {
      name: "staging-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 720, width: 1280 },
      },
    },
  ],
  reporter: [
    ["line"],
    ["html", { open: "never", outputFolder: "playwright-report/staging" }],
  ],
  retries: 0,
  testDir: "./e2e/staging",
  timeout: 60_000,
  use: {
    baseURL: stagingOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  workers: 1,
});

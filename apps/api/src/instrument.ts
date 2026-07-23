import {
  createSentryRelease,
  isSentryDsnConfigured,
  toSentryEnvironment,
} from "@chinasupply/config/env/sentry";
import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN;

export const apiSentryEnvironment = toSentryEnvironment(
  process.env.APP_ENV ?? "local",
);
export const apiSentryRelease = createSentryRelease({
  component: "api",
  explicitRelease: process.env.SENTRY_RELEASE,
  revision:
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.GIT_COMMIT_SHA,
  version: "0.0.0",
});
export const apiSentryEnabled = isSentryDsnConfigured(dsn);

Sentry.init({
  dsn,
  enabled: apiSentryEnabled,
  environment: apiSentryEnvironment,
  registerEsmLoaderHooks: false,
  release: apiSentryRelease,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

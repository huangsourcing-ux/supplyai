import {
  isSentryDsnConfigured,
  toSentryEnvironment,
} from "@chinasupply/config/env/sentry";

export function createWebSentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    dsn,
    enabled: isSentryDsnConfigured(dsn),
    environment: toSentryEnvironment(process.env.NEXT_PUBLIC_APP_ENV),
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  } as const;
}

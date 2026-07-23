import {
  isSentryDsnConfigured,
  toSentryEnvironment,
} from "@chinasupply/config/env/sentry";
import * as Sentry from "@sentry/react-native";

import { mobileEnvironment } from "../env";

const dsn = mobileEnvironment.EXPO_PUBLIC_SENTRY_DSN;

export const mobileSentryEnvironment = toSentryEnvironment(
  mobileEnvironment.EXPO_PUBLIC_APP_ENV,
);

Sentry.init({
  dsn,
  enabled: isSentryDsnConfigured(dsn),
  environment: mobileSentryEnvironment,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

export function createMobileSentrySmokeError(): Error {
  return new Error("M0-T7 Mobile Sentry smoke test");
}

export async function captureMobileSentrySmokeException(): Promise<{
  eventId: string;
  flushed: boolean;
}> {
  const eventId = Sentry.captureException(createMobileSentrySmokeError(), {
    tags: {
      component: "mobile",
      smoke_test: "m0-t7",
    },
  });
  const flushed = await Sentry.flush();

  return { eventId, flushed };
}

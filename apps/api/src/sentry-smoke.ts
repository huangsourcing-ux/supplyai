import "./instrument.js";

import * as Sentry from "@sentry/nestjs";

import {
  apiSentryEnabled,
  apiSentryEnvironment,
  apiSentryRelease,
} from "./instrument.js";
import { createApiSentrySmokeError } from "./monitoring/sentry-smoke-error.js";

async function run(): Promise<void> {
  if (!apiSentryEnabled) {
    throw new Error("Sentry smoke test requires a configured SENTRY_DSN");
  }

  const eventId = Sentry.captureException(createApiSentrySmokeError(), {
    tags: {
      component: "api",
      smoke_test: "m0-t7",
    },
  });
  const flushed = await Sentry.flush(5_000);

  if (!flushed) {
    throw new Error(`Sentry event ${eventId} did not flush before timeout`);
  }

  console.log(
    JSON.stringify({
      environment: apiSentryEnvironment,
      eventId,
      release: apiSentryRelease,
    }),
  );
}

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Sentry smoke failed");
  process.exitCode = 1;
});

import * as Sentry from "@sentry/nextjs";

import { createWebSentryOptions } from "./src/monitoring/sentry-options";

Sentry.init(createWebSentryOptions());

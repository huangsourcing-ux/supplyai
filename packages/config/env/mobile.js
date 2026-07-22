import { z } from "zod";

import {
  deploymentEnvironmentSchema,
  networkUrlSchema,
  parseEnvironment,
  rejectPlaceholder,
  requireClerkKey,
  requireRemoteUrl,
} from "./common.js";

const forbiddenMobileVariables = [
  "CLERK_SECRET_KEY",
  "CLOUDFLARE_API_TOKEN",
  "DATABASE_URL",
  "PAYLOAD_SECRET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "REDIS_URL",
  "SENTRY_AUTH_TOKEN",
];

/** @type {readonly ["EXPO_PUBLIC_API_BASE_URL", "EXPO_PUBLIC_SENTRY_DSN", "EXPO_PUBLIC_POSTHOG_HOST"]} */
const remoteHttpsFields = [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_POSTHOG_HOST",
];

/** @type {readonly ["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", "EXPO_PUBLIC_MAPTILER_KEY", "EXPO_PUBLIC_SENTRY_DSN", "EXPO_PUBLIC_POSTHOG_KEY"]} */
const remotePublicKeyFields = [
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_MAPTILER_KEY",
  "EXPO_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_POSTHOG_KEY",
];

export const mobileEnvSchema = z
  .object({
    EXPO_PUBLIC_APP_ENV: deploymentEnvironmentSchema,
    EXPO_PUBLIC_API_BASE_URL: networkUrlSchema,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(10),
    EXPO_PUBLIC_MAPTILER_KEY: z.string().min(8),
    EXPO_PUBLIC_SENTRY_DSN: networkUrlSchema,
    EXPO_PUBLIC_POSTHOG_KEY: z.string().min(8),
    EXPO_PUBLIC_POSTHOG_HOST: networkUrlSchema,
  })
  .superRefine((environment, context) => {
    if (environment.EXPO_PUBLIC_APP_ENV === "local") {
      return;
    }

    requireClerkKey(
      environment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      "publishable",
      environment.EXPO_PUBLIC_APP_ENV,
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
      context,
    );

    for (const field of remoteHttpsFields) {
      requireRemoteUrl(environment[field], field, context, { httpsOnly: true });
    }

    for (const field of remotePublicKeyFields) {
      rejectPlaceholder(environment[field], field, context);
    }
  });

/**
 * @param {unknown} source
 * @returns {z.infer<typeof mobileEnvSchema>}
 */
export function parseMobileEnv(source) {
  if (source && typeof source === "object") {
    const presentForbiddenVariables = forbiddenMobileVariables.filter(
      (variable) => variable in source,
    );

    if (presentForbiddenVariables.length > 0) {
      throw new Error(
        `Mobile environment validation failed: ${presentForbiddenVariables.join(", ")}`,
      );
    }
  }

  return parseEnvironment(mobileEnvSchema, source, "Mobile");
}

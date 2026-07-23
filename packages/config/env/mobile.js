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

export const mobileEnvSchema = z
  .object({
    EXPO_PUBLIC_APP_ENV: deploymentEnvironmentSchema,
    EXPO_PUBLIC_API_BASE_URL: networkUrlSchema,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(10),
    EXPO_PUBLIC_MAPTILER_KEY: z.string().min(8).optional(),
    EXPO_PUBLIC_SENTRY_DSN: networkUrlSchema.optional(),
    EXPO_PUBLIC_POSTHOG_KEY: z.string().min(8).optional(),
    EXPO_PUBLIC_POSTHOG_HOST: networkUrlSchema.optional(),
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

    requireRemoteUrl(
      environment.EXPO_PUBLIC_API_BASE_URL,
      "EXPO_PUBLIC_API_BASE_URL",
      context,
      { httpsOnly: true },
    );
    rejectPlaceholder(
      environment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
      context,
    );

    if (environment.EXPO_PUBLIC_MAPTILER_KEY !== undefined) {
      rejectPlaceholder(
        environment.EXPO_PUBLIC_MAPTILER_KEY,
        "EXPO_PUBLIC_MAPTILER_KEY",
        context,
      );
    }

    if (environment.EXPO_PUBLIC_SENTRY_DSN !== undefined) {
      requireRemoteUrl(
        environment.EXPO_PUBLIC_SENTRY_DSN,
        "EXPO_PUBLIC_SENTRY_DSN",
        context,
        { httpsOnly: true },
      );
      rejectPlaceholder(
        environment.EXPO_PUBLIC_SENTRY_DSN,
        "EXPO_PUBLIC_SENTRY_DSN",
        context,
      );
    }

    const hasPostHogKey = environment.EXPO_PUBLIC_POSTHOG_KEY !== undefined;
    const hasPostHogHost = environment.EXPO_PUBLIC_POSTHOG_HOST !== undefined;

    if (hasPostHogKey !== hasPostHogHost) {
      context.addIssue({
        code: "custom",
        path: [
          hasPostHogKey
            ? "EXPO_PUBLIC_POSTHOG_HOST"
            : "EXPO_PUBLIC_POSTHOG_KEY",
        ],
        message: "must be provided together with the other PostHog field",
      });
    }

    if (environment.EXPO_PUBLIC_POSTHOG_KEY !== undefined) {
      rejectPlaceholder(
        environment.EXPO_PUBLIC_POSTHOG_KEY,
        "EXPO_PUBLIC_POSTHOG_KEY",
        context,
      );
    }

    if (environment.EXPO_PUBLIC_POSTHOG_HOST !== undefined) {
      requireRemoteUrl(
        environment.EXPO_PUBLIC_POSTHOG_HOST,
        "EXPO_PUBLIC_POSTHOG_HOST",
        context,
        { httpsOnly: true },
      );
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

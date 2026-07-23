import { z } from "zod";

import {
  deploymentEnvironmentSchema,
  networkUrlSchema,
  parseEnvironment,
  rejectPlaceholder,
  requireClerkKey,
  requireR2Prefix,
  requireRemoteUrl,
} from "./common.js";

const secretSchema = z.string().min(8);

/** @type {readonly ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_SENTRY_DSN", "NEXT_PUBLIC_POSTHOG_HOST", "R2_CDN_BASE_URL"]} */
const remoteHttpsFields = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "R2_CDN_BASE_URL",
];

/** @type {readonly ["PAYLOAD_SECRET", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "NEXT_PUBLIC_MAPTILER_KEY", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT", "NEXT_PUBLIC_POSTHOG_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]} */
const remoteSecretFields = [
  "PAYLOAD_SECRET",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_MAPTILER_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];

export const webEnvSchema = z
  .object({
    APP_ENV: deploymentEnvironmentSchema,
    NEXT_PUBLIC_APP_ENV: deploymentEnvironmentSchema,
    DATABASE_URL: networkUrlSchema,
    PAYLOAD_SECRET: z.string().min(32),
    NEXT_PUBLIC_SITE_URL: networkUrlSchema,
    NEXT_PUBLIC_API_BASE_URL: networkUrlSchema,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(10),
    CLERK_SECRET_KEY: z.string().min(10),
    NEXT_PUBLIC_MAPTILER_KEY: secretSchema,
    NEXT_PUBLIC_SENTRY_DSN: networkUrlSchema,
    SENTRY_AUTH_TOKEN: secretSchema,
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_KEY: secretSchema,
    NEXT_PUBLIC_POSTHOG_HOST: networkUrlSchema,
    R2_ACCOUNT_ID: secretSchema,
    R2_ACCESS_KEY_ID: secretSchema,
    R2_SECRET_ACCESS_KEY: secretSchema,
    R2_BUCKET: z.string().min(3),
    R2_PREFIX: z.string(),
    R2_CDN_BASE_URL: networkUrlSchema,
  })
  .superRefine((environment, context) => {
    if (environment.APP_ENV !== environment.NEXT_PUBLIC_APP_ENV) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_ENV"],
        message: "must match APP_ENV",
      });
    }

    requireR2Prefix(environment.R2_PREFIX, environment.APP_ENV, context);

    if (environment.APP_ENV === "local") {
      return;
    }

    requireClerkKey(
      environment.CLERK_SECRET_KEY,
      "secret",
      environment.APP_ENV,
      "CLERK_SECRET_KEY",
      context,
    );
    requireClerkKey(
      environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      "publishable",
      environment.APP_ENV,
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      context,
    );

    requireRemoteUrl(environment.DATABASE_URL, "DATABASE_URL", context);
    for (const field of remoteHttpsFields) {
      requireRemoteUrl(environment[field], field, context, { httpsOnly: true });
    }

    for (const field of remoteSecretFields) {
      const value = environment[field];
      if (value === undefined) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "is required outside local development",
        });
      } else {
        rejectPlaceholder(value, field, context);
      }
    }

    if (!environment.SENTRY_AUTH_TOKEN.startsWith("sntrys_")) {
      context.addIssue({
        code: "custom",
        path: ["SENTRY_AUTH_TOKEN"],
        message: "must use a Sentry organization token",
      });
    }
  });

/**
 * @param {unknown} source
 * @returns {z.infer<typeof webEnvSchema>}
 */
export function parseWebEnv(source) {
  return parseEnvironment(webEnvSchema, source, "Web");
}

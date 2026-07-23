import { z } from "zod";

import {
  deploymentEnvironmentSchema,
  networkUrlSchema,
  parseEnvironment,
  portSchema,
  rejectPlaceholder,
  requireClerkKey,
  requireR2Prefix,
  requireRemoteUrl,
} from "./common.js";

const secretSchema = z.string().min(8);

const apiRuntimeShape = {
  APP_ENV: deploymentEnvironmentSchema,
  PORT: portSchema,
  DATABASE_URL: networkUrlSchema,
  REDIS_URL: networkUrlSchema,
  WEB_ORIGIN: networkUrlSchema,
  RAILWAY_GIT_COMMIT_SHA: z
    .string()
    .regex(/^[a-f0-9]{40}$/i)
    .optional(),
  SENTRY_DSN: networkUrlSchema.optional(),
  SENTRY_RELEASE: z.string().startsWith("chinasupply-api@").min(22).optional(),
};

/** @type {readonly ["DATABASE_URL", "REDIS_URL"]} */
const remoteConnectionFields = ["DATABASE_URL", "REDIS_URL"];

/** @type {readonly ["WEB_ORIGIN", "R2_CDN_BASE_URL", "SENTRY_DSN"]} */
const remoteHttpsFields = ["WEB_ORIGIN", "R2_CDN_BASE_URL", "SENTRY_DSN"];

/** @type {readonly ["CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_API_TOKEN", "SENTRY_DSN"]} */
const remoteSecretFields = [
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_API_TOKEN",
  "SENTRY_DSN",
];

export const apiRuntimeEnvSchema = z
  .object(apiRuntimeShape)
  .superRefine((environment, context) => {
    if (environment.APP_ENV === "local") {
      return;
    }

    for (const field of remoteConnectionFields) {
      requireRemoteUrl(environment[field], field, context);
    }

    requireRemoteUrl(environment.WEB_ORIGIN, "WEB_ORIGIN", context, {
      httpsOnly: true,
    });

    if (environment.SENTRY_DSN === undefined) {
      context.addIssue({
        code: "custom",
        path: ["SENTRY_DSN"],
        message: "is required outside local development",
      });
    } else {
      requireRemoteUrl(environment.SENTRY_DSN, "SENTRY_DSN", context, {
        httpsOnly: true,
      });
      rejectPlaceholder(environment.SENTRY_DSN, "SENTRY_DSN", context);
    }

    if (
      environment.SENTRY_RELEASE === undefined &&
      environment.RAILWAY_GIT_COMMIT_SHA === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["SENTRY_RELEASE"],
        message:
          "or RAILWAY_GIT_COMMIT_SHA is required outside local development",
      });
    }
  });

export const apiEnvSchema = z
  .object({
    ...apiRuntimeShape,
    CLERK_SECRET_KEY: z.string().min(10),
    CLERK_WEBHOOK_SECRET: z.string().startsWith("whsec_").min(10),
    R2_ACCOUNT_ID: secretSchema,
    R2_ACCESS_KEY_ID: secretSchema,
    R2_SECRET_ACCESS_KEY: secretSchema,
    R2_BUCKET: z.string().min(3),
    R2_PREFIX: z.string(),
    R2_CDN_BASE_URL: networkUrlSchema,
    CLOUDFLARE_ZONE_ID: secretSchema,
    CLOUDFLARE_API_TOKEN: secretSchema,
  })
  .superRefine((environment, context) => {
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

    for (const field of remoteConnectionFields) {
      requireRemoteUrl(environment[field], field, context);
    }

    for (const field of remoteHttpsFields) {
      const value = environment[field];
      if (value !== undefined) {
        requireRemoteUrl(value, field, context, { httpsOnly: true });
      }
    }

    for (const field of remoteSecretFields) {
      const value = environment[field];
      if (value !== undefined) {
        rejectPlaceholder(value, field, context);
      }
    }
  });

/**
 * @param {unknown} source
 * @returns {z.infer<typeof apiEnvSchema>}
 */
export function parseApiEnv(source) {
  return parseEnvironment(apiEnvSchema, source, "API");
}

/**
 * Validates only the dependencies used by the M0 API/Worker runtime. Provider
 * modules validate their own environment slice when they are introduced.
 *
 * @param {unknown} source
 * @returns {z.infer<typeof apiRuntimeEnvSchema>}
 */
export function parseApiRuntimeEnv(source) {
  return parseEnvironment(apiRuntimeEnvSchema, source, "API runtime");
}

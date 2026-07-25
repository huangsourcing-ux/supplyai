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
  R2_CDN_BASE_URL: networkUrlSchema,
  CLERK_SECRET_KEY: z.string().min(10).optional(),
  EDGE_PROXY_SECRET: z.string().min(32).optional(),
  CLOUDFLARE_ZONE_ID: secretSchema.optional(),
  CLOUDFLARE_PURGE_TOKEN: secretSchema.optional(),
  RAILWAY_GIT_COMMIT_SHA: z
    .string()
    .regex(/^[a-f0-9]{40}$/i)
    .optional(),
  SENTRY_DSN: networkUrlSchema.optional(),
  SENTRY_RELEASE: z.string().startsWith("chinasupply-api@").min(22).optional(),
};

const privateObjectStorageShape = {
  APP_ENV: deploymentEnvironmentSchema,
  R2_ACCOUNT_ID: secretSchema,
  R2_ACCESS_KEY_ID: secretSchema,
  R2_SECRET_ACCESS_KEY: secretSchema,
  R2_PRIVATE_BUCKET: z.string().min(3),
  R2_PREFIX: z.string(),
  R2_ENDPOINT: networkUrlSchema.optional(),
};

/** @type {readonly ["DATABASE_URL", "REDIS_URL"]} */
const remoteConnectionFields = ["DATABASE_URL", "REDIS_URL"];

/** @type {readonly ["WEB_ORIGIN", "R2_CDN_BASE_URL", "SENTRY_DSN"]} */
const remoteHttpsFields = ["WEB_ORIGIN", "R2_CDN_BASE_URL", "SENTRY_DSN"];

/** @type {readonly ["CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET", "EDGE_PROXY_SECRET", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_MEDIA_BUCKET", "R2_PRIVATE_BUCKET", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_PURGE_TOKEN", "SENTRY_DSN"]} */
const remoteSecretFields = [
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "EDGE_PROXY_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_MEDIA_BUCKET",
  "R2_PRIVATE_BUCKET",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_PURGE_TOKEN",
  "SENTRY_DSN",
];

/** @type {readonly ["CLOUDFLARE_ZONE_ID", "CLOUDFLARE_PURGE_TOKEN"]} */
const remoteHttpProviderFields = [
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_PURGE_TOKEN",
];

/** @type {readonly ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PRIVATE_BUCKET"]} */
const privateObjectStorageSecretFields = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PRIVATE_BUCKET",
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

export const apiHttpEnvSchema = apiRuntimeEnvSchema.superRefine(
  (environment, context) => {
    if (
      environment.APP_ENV !== "local" &&
      environment.CLERK_SECRET_KEY === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["CLERK_SECRET_KEY"],
        message: "is required for remote HTTP deployments",
      });
    }

    if (environment.CLERK_SECRET_KEY !== undefined) {
      requireClerkKey(
        environment.CLERK_SECRET_KEY,
        "secret",
        environment.APP_ENV,
        "CLERK_SECRET_KEY",
        context,
      );
    }

    if (
      environment.APP_ENV !== "local" &&
      environment.EDGE_PROXY_SECRET === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["EDGE_PROXY_SECRET"],
        message: "is required for remote HTTP deployments",
      });
    }

    if (environment.EDGE_PROXY_SECRET !== undefined) {
      rejectPlaceholder(
        environment.EDGE_PROXY_SECRET,
        "EDGE_PROXY_SECRET",
        context,
      );
    }

    for (const field of remoteHttpProviderFields) {
      if (environment.APP_ENV !== "local" && environment[field] === undefined) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "is required for remote HTTP deployments",
        });
      }

      if (environment[field] !== undefined) {
        rejectPlaceholder(environment[field], field, context);
      }
    }
  },
);

export const apiEnvSchema = z
  .object({
    ...apiRuntimeShape,
    CLERK_SECRET_KEY: z.string().min(10),
    CLERK_WEBHOOK_SECRET: z.string().startsWith("whsec_").min(10),
    R2_ACCOUNT_ID: secretSchema,
    R2_ACCESS_KEY_ID: secretSchema,
    R2_SECRET_ACCESS_KEY: secretSchema,
    R2_MEDIA_BUCKET: z.string().min(3),
    R2_PRIVATE_BUCKET: z.string().min(3),
    R2_PREFIX: z.string(),
    R2_ENDPOINT: networkUrlSchema.optional(),
    CLOUDFLARE_ZONE_ID: secretSchema,
    CLOUDFLARE_PURGE_TOKEN: secretSchema,
  })
  .superRefine((environment, context) => {
    requireR2Prefix(environment.R2_PREFIX, environment.APP_ENV, context);

    if (environment.R2_MEDIA_BUCKET === environment.R2_PRIVATE_BUCKET) {
      context.addIssue({
        code: "custom",
        path: ["R2_PRIVATE_BUCKET"],
        message: "must be different from R2_MEDIA_BUCKET",
      });
    }

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

export const privateObjectStorageEnvSchema = z
  .object(privateObjectStorageShape)
  .superRefine((environment, context) => {
    requireR2Prefix(environment.R2_PREFIX, environment.APP_ENV, context);

    if (
      environment.APP_ENV !== "local" &&
      environment.R2_ENDPOINT !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["R2_ENDPOINT"],
        message: "may only override the Cloudflare endpoint locally",
      });
    }

    if (environment.APP_ENV !== "local") {
      for (const field of privateObjectStorageSecretFields) {
        rejectPlaceholder(environment[field], field, context);
      }
    }
  });

export const importCliEnvSchema = privateObjectStorageEnvSchema.and(
  z.object({
    REDIS_URL: networkUrlSchema,
  }),
);

export const seedCliEnvSchema = importCliEnvSchema.and(
  z.object({
    DATABASE_URL: networkUrlSchema,
  }),
);

/**
 * @param {unknown} source
 * @returns {z.infer<typeof apiEnvSchema>}
 */
export function parseApiEnv(source) {
  return parseEnvironment(apiEnvSchema, source, "API");
}

/**
 * @param {unknown} source
 * @returns {z.infer<typeof privateObjectStorageEnvSchema>}
 */
export function parsePrivateObjectStorageEnv(source) {
  return parseEnvironment(
    privateObjectStorageEnvSchema,
    source,
    "Private object storage",
  );
}

/**
 * @param {unknown} source
 * @returns {z.infer<typeof importCliEnvSchema>}
 */
export function parseImportCliEnv(source) {
  return parseEnvironment(importCliEnvSchema, source, "Import CLI");
}

/**
 * @param {unknown} source
 * @returns {z.infer<typeof seedCliEnvSchema>}
 */
export function parseSeedCliEnv(source) {
  return parseEnvironment(seedCliEnvSchema, source, "Seed CLI");
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

/**
 * Validates the API HTTP entrypoint, including the Cloudflare-to-origin trust
 * boundary. The Worker deliberately continues to use parseApiRuntimeEnv.
 *
 * @param {unknown} source
 * @returns {z.infer<typeof apiHttpEnvSchema>}
 */
export function parseApiHttpEnv(source) {
  return parseEnvironment(apiHttpEnvSchema, source, "API HTTP");
}

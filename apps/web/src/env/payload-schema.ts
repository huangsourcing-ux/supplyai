import {
  deploymentEnvironmentSchema,
  networkUrlSchema,
  parseEnvironment,
  rejectPlaceholder,
  requireRemoteUrl,
  requireR2Prefix,
} from "@chinasupply/config/env/common";
import { z } from "zod";

const storageFields = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_MEDIA_BUCKET",
  "R2_PREFIX",
  "R2_CDN_BASE_URL",
] as const;

const payloadEnvironmentSchema = z
  .object({
    APP_ENV: deploymentEnvironmentSchema,
    DATABASE_URL: networkUrlSchema,
    NEXT_PUBLIC_SITE_URL: networkUrlSchema,
    PAYLOAD_SECRET: z.string().min(32),
    R2_ACCOUNT_ID: z.string().min(8).optional(),
    R2_ACCESS_KEY_ID: z.string().min(8).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(8).optional(),
    R2_MEDIA_BUCKET: z.string().min(3).optional(),
    R2_PREFIX: z.string().optional(),
    R2_CDN_BASE_URL: networkUrlSchema.optional(),
    R2_ENDPOINT: networkUrlSchema.optional(),
  })
  .superRefine((environment, context) => {
    const configuredStorageFields = storageFields.filter(
      (field) => environment[field] !== undefined,
    );

    if (
      configuredStorageFields.length > 0 &&
      configuredStorageFields.length !== storageFields.length
    ) {
      for (const field of storageFields) {
        if (environment[field] === undefined) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: "is required when Payload R2 storage is configured",
          });
        }
      }
    }

    if (configuredStorageFields.length === storageFields.length) {
      requireR2Prefix(environment.R2_PREFIX!, environment.APP_ENV, context);
    }

    if (environment.APP_ENV === "local") {
      return;
    }

    requireRemoteUrl(environment.DATABASE_URL, "DATABASE_URL", context);
    requireRemoteUrl(
      environment.NEXT_PUBLIC_SITE_URL,
      "NEXT_PUBLIC_SITE_URL",
      context,
      { httpsOnly: true },
    );
    rejectPlaceholder(environment.PAYLOAD_SECRET, "PAYLOAD_SECRET", context);

    if (configuredStorageFields.length === storageFields.length) {
      requireRemoteUrl(
        environment.R2_CDN_BASE_URL!,
        "R2_CDN_BASE_URL",
        context,
        { httpsOnly: true },
      );
      if (environment.R2_ENDPOINT !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["R2_ENDPOINT"],
          message: "may only override the Cloudflare endpoint locally",
        });
      }
      for (const field of [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_MEDIA_BUCKET",
      ] as const) {
        rejectPlaceholder(environment[field]!, field, context);
      }
    }
  });

export function parsePayloadEnv(source: unknown) {
  return parseEnvironment(payloadEnvironmentSchema, source, "Payload");
}

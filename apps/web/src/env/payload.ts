import { parsePayloadEnv } from "./payload-schema";

const parsedEnvironment = parsePayloadEnv(process.env);

const hasMediaStorage = parsedEnvironment.R2_ACCOUNT_ID !== undefined;

const mediaStorage = hasMediaStorage
  ? {
      accessKeyId: parsedEnvironment.R2_ACCESS_KEY_ID!,
      accountId: parsedEnvironment.R2_ACCOUNT_ID!,
      bucket: parsedEnvironment.R2_MEDIA_BUCKET!,
      cdnBaseUrl: parsedEnvironment.R2_CDN_BASE_URL!.replace(/\/+$/u, ""),
      endpoint:
        parsedEnvironment.R2_ENDPOINT ??
        `https://${parsedEnvironment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      prefix: parsedEnvironment.R2_PREFIX!,
      secretAccessKey: parsedEnvironment.R2_SECRET_ACCESS_KEY!,
    }
  : null;

export const payloadEnvironment = Object.freeze({
  appEnvironment: parsedEnvironment.APP_ENV,
  databaseUrl: parsedEnvironment.DATABASE_URL,
  mediaStorage,
  payloadSecret: parsedEnvironment.PAYLOAD_SECRET,
  siteUrl: parsedEnvironment.NEXT_PUBLIC_SITE_URL,
});

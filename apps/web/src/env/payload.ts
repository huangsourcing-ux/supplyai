import { parsePayloadEnv } from "./payload-schema";

const parsedEnvironment = parsePayloadEnv(process.env);

export const payloadEnvironment = Object.freeze({
  databaseUrl: parsedEnvironment.DATABASE_URL,
  payloadSecret: parsedEnvironment.PAYLOAD_SECRET,
  siteUrl: parsedEnvironment.NEXT_PUBLIC_SITE_URL,
});

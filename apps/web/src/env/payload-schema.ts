import {
  deploymentEnvironmentSchema,
  networkUrlSchema,
  parseEnvironment,
  rejectPlaceholder,
  requireRemoteUrl,
} from "@chinasupply/config/env/common";
import { z } from "zod";

const payloadEnvironmentSchema = z
  .object({
    APP_ENV: deploymentEnvironmentSchema,
    DATABASE_URL: networkUrlSchema,
    NEXT_PUBLIC_SITE_URL: networkUrlSchema,
    PAYLOAD_SECRET: z.string().min(32),
  })
  .superRefine((environment, context) => {
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
  });

export function parsePayloadEnv(source: unknown) {
  return parseEnvironment(payloadEnvironmentSchema, source, "Payload");
}

import { z } from "zod";

import { createStandardSuccessEnvelopeSchema } from "./envelope.js";

export const healthLiveDataSchema = z.strictObject({
  status: z.literal("ok"),
});

export const healthLiveResponseSchema =
  createStandardSuccessEnvelopeSchema(healthLiveDataSchema);

export type HealthLiveData = z.infer<typeof healthLiveDataSchema>;

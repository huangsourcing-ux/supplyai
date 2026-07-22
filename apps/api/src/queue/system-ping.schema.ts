import { z } from "zod";

export const systemPingDataSchema = z
  .object({
    sentAt: z.iso.datetime(),
  })
  .strict();

export type SystemPingData = z.infer<typeof systemPingDataSchema>;

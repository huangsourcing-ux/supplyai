import { z } from "zod";

export const localizedTextSchema = z.object({
  en: z.string().min(1),
  zh: z.string().min(1),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;

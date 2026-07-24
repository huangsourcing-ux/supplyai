import { z } from "zod";

const nonEmptyTextSchema = z.string().trim().min(1);

export const localizedTextSchema = z
  .object({
    en: nonEmptyTextSchema,
    zh: nonEmptyTextSchema,
  })
  .strict();

export const localizedAliasesSchema = z
  .object({
    en: z.array(nonEmptyTextSchema).optional(),
    zh: z.array(nonEmptyTextSchema).optional(),
  })
  .strict();

export const localizedTextListSchema = z.array(localizedTextSchema);

export const coordinateSchema = z
  .object({
    lng: z.number().finite().min(-180).max(180),
    lat: z.number().finite().min(-90).max(90),
  })
  .strict();

export const clusterStatsSchema = z
  .object({
    annualOutputUsd: z.number().finite().optional(),
    exportShare: z.number().finite().optional(),
    note: localizedTextSchema.optional(),
  })
  .strict();

export const factoryContactSchema = z
  .object({
    website: nonEmptyTextSchema.optional(),
    email: nonEmptyTextSchema.optional(),
    phone: nonEmptyTextSchema.optional(),
    wechat: nonEmptyTextSchema.optional(),
  })
  .strict();

export const factoryImageSchema = z
  .object({
    objectKey: nonEmptyTextSchema,
    alt: localizedTextSchema,
  })
  .strict();

export const factoryImagesSchema = z.array(factoryImageSchema);

export type ClusterStats = z.infer<typeof clusterStatsSchema>;
export type Coordinate = z.infer<typeof coordinateSchema>;
export type FactoryContact = z.infer<typeof factoryContactSchema>;
export type FactoryImage = z.infer<typeof factoryImageSchema>;
export type LocalizedAliases = z.infer<typeof localizedAliasesSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;

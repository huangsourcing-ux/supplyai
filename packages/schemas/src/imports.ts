import { z } from "zod";

import {
  clusterStatsSchema,
  factoryContactSchema,
  factoryImagesSchema,
  localizedTextListSchema,
  localizedTextSchema,
} from "./core-data.js";
import { geoJsonMultiPolygonSchema, wgs84PositionSchema } from "./geojson.js";
import {
  coreIdSchema,
  objectKeySchema,
  slugSchema,
  utcDateTimeSchema,
} from "./primitives.js";

export const IMPORT_CONTRACT_VERSION = 1;

export const importEntitySchema = z.enum(["clusters", "factories"]);
export const importSourceFormatSchema = z.enum(["csv", "json"]);
export const sourceCoordinateSystemSchema = z.enum(["wgs84", "gcj02"]);
export const importJobNameSchema = z.enum([
  "import:clusters",
  "import:factories",
]);

const nullableTextSchema = z.string().trim().min(1).nullable().default(null);
const uniqueSlugListSchema = z
  .array(slugSchema)
  .superRefine((values, context) => {
    const seen = new Set<string>();
    for (const [index, value] of values.entries()) {
      if (seen.has(value)) {
        context.addIssue({
          code: "custom",
          message: "Slug values must be unique",
          path: [index],
        });
      }
      seen.add(value);
    }
  });

export const clusterImportRowSchema = z
  .strictObject({
    slug: slugSchema,
    name: localizedTextSchema,
    regionId: coreIdSchema,
    primaryCategorySlug: slugSchema,
    categorySlugs: uniqueSlugListSchema.min(1),
    centroid: wgs84PositionSchema,
    boundary: geoJsonMultiPolygonSchema.nullable().default(null),
    summary: localizedTextSchema,
    description: localizedTextSchema.nullable().default(null),
    mainProducts: localizedTextListSchema,
    coverImage: objectKeySchema.nullable().default(null),
    stats: clusterStatsSchema.nullable().default(null),
  })
  .superRefine((row, context) => {
    if (!row.categorySlugs.includes(row.primaryCategorySlug)) {
      context.addIssue({
        code: "custom",
        message: "primaryCategorySlug must be included in categorySlugs",
        path: ["primaryCategorySlug"],
      });
    }
  });

export const factoryImportRowSchema = z.strictObject({
  slug: slugSchema,
  name: localizedTextSchema,
  clusterSlug: slugSchema.nullable().default(null),
  regionId: coreIdSchema,
  address: localizedTextSchema,
  location: wgs84PositionSchema,
  categorySlugs: uniqueSlugListSchema.default([]),
  mainProducts: localizedTextListSchema,
  certifications: z.array(z.string().trim().min(1)).default([]),
  moq: nullableTextSchema,
  establishedYear: z.number().int().nullable().default(null),
  employeeRange: nullableTextSchema,
  contact: factoryContactSchema.nullable().default(null),
  images: factoryImagesSchema.default([]),
  sourceName: nullableTextSchema,
  sourceUrl: nullableTextSchema,
});

export const clusterImportJsonDocumentSchema = z.strictObject({
  version: z.literal(IMPORT_CONTRACT_VERSION),
  rows: z.array(z.unknown()),
});

export const factoryImportJsonDocumentSchema = z.strictObject({
  version: z.literal(IMPORT_CONTRACT_VERSION),
  rows: z.array(z.unknown()),
});

export const importJobDataSchema = z.strictObject({
  version: z.literal(IMPORT_CONTRACT_VERSION),
  importId: coreIdSchema,
  entity: importEntitySchema,
  sourceFormat: importSourceFormatSchema,
  sourceCoordinateSystem: sourceCoordinateSystemSchema,
  sourceObjectKey: objectKeySchema,
  reportObjectKey: objectKeySchema,
});

export const importReportIssueSchema = z.strictObject({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export const importReportSuccessSchema = z.strictObject({
  row: z.number().int().positive(),
  slug: slugSchema,
  action: z.enum(["inserted", "updated"]),
});

export const importReportFailureSchema = z.strictObject({
  row: z.number().int().positive(),
  slug: slugSchema.optional(),
  issues: z.array(importReportIssueSchema).min(1),
});

export const importReportTotalsSchema = z.strictObject({
  received: z.number().int().nonnegative(),
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const importReportSchema = z.strictObject({
  version: z.literal(IMPORT_CONTRACT_VERSION),
  importId: coreIdSchema,
  entity: importEntitySchema,
  sourceFormat: importSourceFormatSchema,
  sourceCoordinateSystem: sourceCoordinateSystemSchema,
  sourceObjectKey: objectKeySchema,
  reportObjectKey: objectKeySchema,
  startedAt: utcDateTimeSchema,
  finishedAt: utcDateTimeSchema,
  totals: importReportTotalsSchema,
  successes: z.array(importReportSuccessSchema),
  failures: z.array(importReportFailureSchema),
  fatal: z.string().trim().min(1).nullable(),
});

export const importJobResultSchema = z.strictObject({
  reportObjectKey: objectKeySchema,
  totals: importReportTotalsSchema,
});

export const CLUSTER_IMPORT_CSV_HEADERS = [
  "slug",
  "nameEn",
  "nameZh",
  "regionId",
  "primaryCategorySlug",
  "categorySlugs",
  "centroidLng",
  "centroidLat",
  "boundary",
  "summaryEn",
  "summaryZh",
  "descriptionEn",
  "descriptionZh",
  "mainProducts",
  "coverImage",
  "stats",
] as const;

export const FACTORY_IMPORT_CSV_HEADERS = [
  "slug",
  "nameEn",
  "nameZh",
  "clusterSlug",
  "regionId",
  "addressEn",
  "addressZh",
  "locationLng",
  "locationLat",
  "categorySlugs",
  "mainProducts",
  "certifications",
  "moq",
  "establishedYear",
  "employeeRange",
  "contact",
  "images",
  "sourceName",
  "sourceUrl",
] as const;

export type ClusterImportRow = z.infer<typeof clusterImportRowSchema>;
export type FactoryImportRow = z.infer<typeof factoryImportRowSchema>;
export type ImportEntity = z.infer<typeof importEntitySchema>;
export type ImportJobData = z.infer<typeof importJobDataSchema>;
export type ImportJobName = z.infer<typeof importJobNameSchema>;
export type ImportJobResult = z.infer<typeof importJobResultSchema>;
export type ImportReport = z.infer<typeof importReportSchema>;
export type ImportReportFailure = z.infer<typeof importReportFailureSchema>;
export type ImportReportIssue = z.infer<typeof importReportIssueSchema>;
export type ImportSourceFormat = z.infer<typeof importSourceFormatSchema>;
export type SourceCoordinateSystem = z.infer<
  typeof sourceCoordinateSystemSchema
>;

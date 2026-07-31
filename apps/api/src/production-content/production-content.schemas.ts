import { z } from "zod";

const idSchema = z
  .string()
  .length(21)
  .regex(/^[A-Za-z0-9_-]+$/u);
const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const timestampSchema = z.string().datetime({ offset: true });
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const localizedTextSchema = z.strictObject({
  en: z.string().min(1),
  zh: z.string().min(1),
});
const pointSchema = z.strictObject({
  type: z.literal("Point"),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
});
const multiPolygonSchema = z
  .object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.unknown()).min(1),
  })
  .strict();

const coreRowSchema = z
  .object({
    id: idSchema,
  })
  .passthrough();

const regionRowSchema = coreRowSchema.extend({
  boundary: multiPolygonSchema.nullable(),
  centroid: pointSchema,
  level: z.enum(["province", "city", "county"]),
  name: localizedTextSchema,
  parentId: idSchema.nullable(),
});

const categoryRowSchema = coreRowSchema.extend({
  aliases: z.record(z.string(), z.array(z.string())),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  name: localizedTextSchema,
  parentId: idSchema.nullable(),
  searchTextEn: z.string().min(1),
  searchTextZh: z.string().min(1),
  slug: slugSchema,
  sortOrder: z.number().int(),
});

const clusterRowSchema = coreRowSchema.extend({
  boundary: multiPolygonSchema.nullable(),
  categoryIds: z.array(idSchema).min(1),
  centroid: pointSchema,
  coverImage: z.string().nullable(),
  description: localizedTextSchema.nullable(),
  mainProducts: z.array(localizedTextSchema).min(1),
  name: localizedTextSchema,
  primaryCategoryId: idSchema,
  publishedAt: timestampSchema,
  regionId: idSchema,
  searchTextEn: z.string().min(1),
  searchTextZh: z.string().min(1),
  slug: slugSchema,
  stats: z.record(z.string(), z.unknown()).nullable(),
  status: z.literal("published"),
  summary: localizedTextSchema,
});

const factoryRowSchema = coreRowSchema.extend({
  address: localizedTextSchema,
  categoryIds: z.array(idSchema).min(1),
  certifications: z.array(z.string()),
  clusterId: idSchema,
  contact: z.record(z.string(), z.string()).nullable(),
  employeeRange: z.string().nullable(),
  establishedYear: z.number().int().nullable(),
  images: z.array(
    z
      .object({
        alt: localizedTextSchema,
        objectKey: z.string().min(1),
      })
      .strict(),
  ),
  location: pointSchema,
  locationGcj02: z
    .strictObject({
      lng: z.number().min(-180).max(180),
      lat: z.number().min(-90).max(90),
    })
    .nullable(),
  mainProducts: z.array(localizedTextSchema).min(1),
  moq: z.string().nullable(),
  name: localizedTextSchema,
  publishedAt: timestampSchema,
  regionId: idSchema,
  searchTextEn: z.string().min(1),
  searchTextZh: z.string().min(1),
  slug: slugSchema,
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  status: z.literal("published"),
  verified: z.literal(true),
  verifiedBy: z.string().min(1),
  verifiedAt: timestampSchema,
  lastVerifiedAt: timestampSchema,
});

const articleRowSchema = z
  .object({
    _status: z.literal("published"),
    body: z.record(z.string(), z.unknown()),
    coverId: z.number().int().positive().nullable(),
    id: z.number().int().positive(),
    locale: z.literal("en"),
    publishedAt: timestampSchema,
    slug: slugSchema,
    title: z.string().min(1),
  })
  .strict();

const mediaRowSchema = z
  .object({
    aiGenerated: z.boolean(),
    alt: z.string().min(1),
    filename: z.string().min(1),
    filesize: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    focalX: z.number().int().nullable(),
    focalY: z.number().int().nullable(),
    height: z.number().int().positive(),
    id: z.number().int().positive(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    objectKey: z.string().min(1),
    prefix: z.string().min(1),
    width: z.number().int().positive(),
  })
  .strict();

export const productionCurationSchema = z.strictObject({
  version: z.literal("m5-t8a-curation-v1"),
  reviewedAt: timestampSchema,
  reviewedBy: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  clusterSlugs: z.array(slugSchema).min(1),
  factorySlugs: z.array(slugSchema).min(1),
  guideSlugs: z.array(slugSchema),
});

export const productionDatasetSchema = z.strictObject({
  version: z.literal("m5-t8a-dataset-v1"),
  exportedAt: timestampSchema,
  sourceEnvironment: z.literal("staging"),
  curation: productionCurationSchema,
  regions: z.array(regionRowSchema).min(1),
  categories: z.array(categoryRowSchema).min(1),
  clusters: z.array(clusterRowSchema).min(1),
  factories: z.array(factoryRowSchema).min(1),
  articles: z.array(articleRowSchema),
  media: z.array(mediaRowSchema),
});

export const productionMediaManifestEntrySchema = z.strictObject({
  sourceObjectKey: z.string().startsWith("staging/"),
  destinationObjectKey: z
    .string()
    .min(1)
    .refine((value) => {
      return !value.startsWith("/") && !value.startsWith("staging/");
    }),
  bytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sha256: sha256Schema,
});

export const productionContentManifestSchema = z.strictObject({
  version: z.literal("m5-t8a-manifest-v1"),
  createdAt: timestampSchema,
  sourceEnvironment: z.literal("staging"),
  destinationEnvironment: z.literal("production"),
  dataset: z.strictObject({
    objectKey: z.string().min(1),
    bytes: z.number().int().positive(),
    sha256: sha256Schema,
  }),
  counts: z.strictObject({
    regions: z.number().int().positive(),
    categories: z.number().int().positive(),
    clusters: z.number().int().positive(),
    factories: z.number().int().positive(),
    articles: z.number().int().nonnegative(),
    media: z.number().int().nonnegative(),
  }),
  slugs: z.strictObject({
    clusters: z.array(slugSchema).min(1),
    factories: z.array(slugSchema).min(1),
    articles: z.array(slugSchema),
  }),
  media: z.array(productionMediaManifestEntrySchema),
});

export type ProductionContentManifest = z.infer<
  typeof productionContentManifestSchema
>;
export type ProductionCuration = z.infer<typeof productionCurationSchema>;
export type ProductionDataset = z.infer<typeof productionDatasetSchema>;
export type ProductionMediaManifestEntry = z.infer<
  typeof productionMediaManifestEntrySchema
>;

import { z } from "zod";

import {
  clusterStatsSchema,
  factoryContactSchema,
  localizedTextListSchema,
  localizedTextSchema,
} from "./core-data.js";
import { geoJsonMultiPolygonSchema, geoJsonPointSchema } from "./geojson.js";
import {
  absoluteUrlSchema,
  coreIdSchema,
  favoriteTargetTypeSchema,
  localeSchema,
  objectKeySchema,
  publicationStatusSchema,
  regionLevelSchema,
  slugSchema,
  utcDateTimeSchema,
} from "./primitives.js";

const nullableTextSchema = z.string().trim().min(1).nullable();
const nullableUrlSchema = absoluteUrlSchema.nullable();

export const publicRegionSummarySchema = z.strictObject({
  id: coreIdSchema,
  level: regionLevelSchema,
  name: z.string().min(1),
});

export const publicCategorySummarySchema = z.strictObject({
  id: coreIdSchema,
  parentId: coreIdSchema.nullable(),
  slug: slugSchema,
  name: z.string().min(1),
  icon: nullableTextSchema,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/u)
    .nullable(),
  sortOrder: z.number().int(),
});

export const publicRootCategorySummarySchema = publicCategorySummarySchema
  .extend({
    parentId: z.null(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/u),
  })
  .strict();

export const publicCategoryTreeSchema = publicRootCategorySummarySchema
  .extend({
    children: z.array(
      publicCategorySummarySchema.extend({
        parentId: coreIdSchema,
        color: z.null(),
      }),
    ),
  })
  .strict()
  .superRefine((value, context) => {
    value.children.forEach((child, index) => {
      if (child.parentId !== value.id) {
        context.addIssue({
          code: "custom",
          path: ["children", index, "parentId"],
          message: "Child category parentId must match the root category id",
        });
      }
    });
  });

export const publicClusterReferenceSchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name: z.string().min(1),
});

export const publicClusterStatsSchema = z.strictObject({
  annualOutputUsd: z.number().finite().optional(),
  exportShare: z.number().finite().optional(),
  note: z.string().min(1).optional(),
});

export const publicClusterSummarySchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name: z.string().min(1),
  region: publicRegionSummarySchema,
  primaryCategory: publicRootCategorySummarySchema,
  centroid: geoJsonPointSchema,
  summary: z.string().min(1),
  mainProducts: z.array(z.string().min(1)).min(1),
  coverImageUrl: nullableUrlSchema,
  factoryCount: z.number().int().nonnegative(),
  publishedAt: utcDateTimeSchema,
});

export const publicClusterDetailSchema = publicClusterSummarySchema
  .extend({
    categories: z.array(publicCategorySummarySchema).min(1),
    boundary: geoJsonMultiPolygonSchema.nullable(),
    description: z.string().min(1).nullable(),
    stats: publicClusterStatsSchema.nullable(),
  })
  .strict();

export const publicFactoryImageSchema = z.strictObject({
  url: absoluteUrlSchema,
  alt: z.string().min(1),
});

export const publicFactorySummarySchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name: z.string().min(1),
  cluster: publicClusterReferenceSchema.nullable(),
  region: publicRegionSummarySchema,
  location: geoJsonPointSchema,
  mainProducts: z.array(z.string().min(1)).min(1),
  verified: z.boolean(),
  imageUrl: nullableUrlSchema,
  publishedAt: utcDateTimeSchema,
});

export const publicFactoryDetailSchema = publicFactorySummarySchema
  .extend({
    categories: z.array(publicCategorySummarySchema).min(1),
    address: localizedTextSchema,
    certifications: z.array(z.string().min(1)),
    moq: nullableTextSchema,
    establishedYear: z.number().int().min(1800).max(2100).nullable(),
    employeeRange: nullableTextSchema,
    contact: factoryContactSchema.nullable(),
    images: z.array(publicFactoryImageSchema),
    sourceName: nullableTextSchema,
    sourceUrl: nullableUrlSchema,
    verifiedAt: utcDateTimeSchema.nullable(),
    lastVerifiedAt: utcDateTimeSchema.nullable(),
    relatedFactories: z.array(publicFactorySummarySchema).max(10),
  })
  .strict();

export const userSchema = z.strictObject({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().trim().min(1).nullable(),
  locale: localeSchema,
});

export const favoriteItemSchema = z.union([
  z.strictObject({
    id: coreIdSchema,
    targetType: z.literal("cluster"),
    targetId: coreIdSchema,
    createdAt: utcDateTimeSchema,
    target: publicClusterSummarySchema,
  }),
  z.strictObject({
    id: coreIdSchema,
    targetType: z.literal("factory"),
    targetId: coreIdSchema,
    createdAt: utcDateTimeSchema,
    target: publicFactorySummarySchema,
  }),
  z.strictObject({
    id: coreIdSchema,
    targetType: favoriteTargetTypeSchema,
    targetId: coreIdSchema,
    createdAt: utcDateTimeSchema,
    target: z.null(),
  }),
]);

export const adminMediaReferenceSchema = z.strictObject({
  objectKey: objectKeySchema,
  url: absoluteUrlSchema,
});

export const adminFactoryImageSchema = adminMediaReferenceSchema
  .extend({
    alt: localizedTextSchema,
  })
  .strict();

export const adminClusterListItemSchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name: localizedTextSchema,
  status: publicationStatusSchema,
  factoryCount: z.number().int().nonnegative(),
  publishedAt: utcDateTimeSchema.nullable(),
  updatedAt: utcDateTimeSchema,
});

export const adminFactoryListItemSchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name: localizedTextSchema,
  status: publicationStatusSchema,
  verified: z.boolean(),
  publishedAt: utcDateTimeSchema.nullable(),
  updatedAt: utcDateTimeSchema,
});

export const adminClusterSchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name: localizedTextSchema,
  regionId: coreIdSchema,
  primaryCategoryId: coreIdSchema,
  categoryIds: z.array(coreIdSchema).min(1),
  centroid: geoJsonPointSchema,
  boundary: geoJsonMultiPolygonSchema.nullable(),
  summary: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  mainProducts: localizedTextListSchema,
  coverImage: adminMediaReferenceSchema.nullable(),
  stats: clusterStatsSchema.nullable(),
  status: publicationStatusSchema,
  publishedAt: utcDateTimeSchema.nullable(),
  createdAt: utcDateTimeSchema,
  updatedAt: utcDateTimeSchema,
});

export const adminFactorySchema = z.strictObject({
  id: coreIdSchema,
  slug: slugSchema,
  name: localizedTextSchema,
  clusterId: coreIdSchema.nullable(),
  regionId: coreIdSchema,
  categoryIds: z.array(coreIdSchema),
  address: localizedTextSchema,
  location: geoJsonPointSchema,
  mainProducts: localizedTextListSchema,
  certifications: z.array(z.string().trim().min(1)),
  moq: nullableTextSchema,
  establishedYear: z.number().int().min(1800).max(2100).nullable(),
  employeeRange: nullableTextSchema,
  contact: factoryContactSchema.nullable(),
  images: z.array(adminFactoryImageSchema),
  sourceName: nullableTextSchema,
  sourceUrl: nullableUrlSchema,
  verified: z.boolean(),
  verifiedAt: utcDateTimeSchema.nullable(),
  lastVerifiedAt: utcDateTimeSchema.nullable(),
  verifiedBy: z.string().min(1).nullable(),
  status: publicationStatusSchema,
  publishedAt: utcDateTimeSchema.nullable(),
  createdAt: utcDateTimeSchema,
  updatedAt: utcDateTimeSchema,
});

export type AdminCluster = z.infer<typeof adminClusterSchema>;
export type AdminFactory = z.infer<typeof adminFactorySchema>;
export type FavoriteItem = z.infer<typeof favoriteItemSchema>;
export type PublicCategorySummary = z.infer<typeof publicCategorySummarySchema>;
export type PublicClusterDetail = z.infer<typeof publicClusterDetailSchema>;
export type PublicClusterSummary = z.infer<typeof publicClusterSummarySchema>;
export type PublicFactoryDetail = z.infer<typeof publicFactoryDetailSchema>;
export type PublicFactorySummary = z.infer<typeof publicFactorySummarySchema>;
export type PublicRegionSummary = z.infer<typeof publicRegionSummarySchema>;
export type User = z.infer<typeof userSchema>;

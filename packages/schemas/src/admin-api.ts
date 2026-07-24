import { z } from "zod";

import {
  clusterStatsSchema,
  factoryContactSchema,
  factoryImagesSchema,
  localizedTextListSchema,
  localizedTextSchema,
} from "./core-data.js";
import {
  adminClusterListItemSchema,
  adminClusterSchema,
  adminFactoryListItemSchema,
  adminFactorySchema,
} from "./entities.js";
import {
  createPaginatedSuccessEnvelopeSchema,
  createStandardSuccessEnvelopeSchema,
} from "./envelope.js";
import { geoJsonMultiPolygonSchema, geoJsonPointSchema } from "./geojson.js";
import { idParamsSchema } from "./http-input.js";
import { paginationQuerySchema } from "./pagination.js";
import {
  absoluteUrlSchema,
  coreIdSchema,
  mediaContentTypeSchema,
  objectKeySchema,
  slugSchema,
  uploadKindSchema,
  utcDateTimeSchema,
  MAX_UPLOAD_BYTES,
} from "./primitives.js";

const categoryIdsSchema = z
  .array(coreIdSchema)
  .min(1)
  .refine((values) => new Set(values).size === values.length, {
    message: "categoryIds must not contain duplicates",
  });

const clusterWriteFieldsSchema = z.strictObject({
  slug: slugSchema,
  name: localizedTextSchema,
  regionId: coreIdSchema,
  primaryCategoryId: coreIdSchema,
  categoryIds: categoryIdsSchema,
  centroid: geoJsonPointSchema,
  boundary: geoJsonMultiPolygonSchema.nullable(),
  summary: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  mainProducts: localizedTextListSchema.min(1),
  coverImageObjectKey: objectKeySchema.nullable(),
  stats: clusterStatsSchema.nullable(),
});

export const createAdminClusterBodySchema = clusterWriteFieldsSchema
  .extend({
    boundary: geoJsonMultiPolygonSchema.nullable().optional(),
    description: localizedTextSchema.nullable().optional(),
    coverImageObjectKey: objectKeySchema.nullable().optional(),
    stats: clusterStatsSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (!value.categoryIds.includes(value.primaryCategoryId)) {
      context.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message: "categoryIds must include primaryCategoryId",
      });
    }
  });

export const updateAdminClusterBodySchema = clusterWriteFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .superRefine((value, context) => {
    if (
      value.primaryCategoryId !== undefined &&
      value.categoryIds !== undefined &&
      !value.categoryIds.includes(value.primaryCategoryId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message: "categoryIds must include primaryCategoryId",
      });
    }
  });

const factoryWriteFieldsSchema = z.strictObject({
  slug: slugSchema,
  name: localizedTextSchema,
  clusterId: coreIdSchema.nullable(),
  regionId: coreIdSchema,
  categoryIds: categoryIdsSchema,
  address: localizedTextSchema,
  location: geoJsonPointSchema,
  mainProducts: localizedTextListSchema.min(1),
  certifications: z.array(z.string().trim().min(1)),
  moq: z.string().trim().min(1).nullable(),
  establishedYear: z.number().int().min(1800).max(2100).nullable(),
  employeeRange: z.string().trim().min(1).nullable(),
  contact: factoryContactSchema.nullable(),
  images: factoryImagesSchema,
  sourceName: z.string().trim().min(1).nullable(),
  sourceUrl: absoluteUrlSchema.nullable(),
});

export const createAdminFactoryBodySchema = factoryWriteFieldsSchema.extend({
  clusterId: coreIdSchema.nullable().optional(),
  certifications: z.array(z.string().trim().min(1)).optional(),
  moq: z.string().trim().min(1).nullable().optional(),
  establishedYear: z.number().int().min(1800).max(2100).nullable().optional(),
  employeeRange: z.string().trim().min(1).nullable().optional(),
  contact: factoryContactSchema.nullable().optional(),
  images: factoryImagesSchema.optional(),
  sourceName: z.string().trim().min(1).nullable().optional(),
  sourceUrl: absoluteUrlSchema.nullable().optional(),
});

export const updateAdminFactoryBodySchema = factoryWriteFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const getAdminClustersQuerySchema = paginationQuerySchema;
export const getAdminClustersResponseSchema =
  createPaginatedSuccessEnvelopeSchema(z.array(adminClusterListItemSchema));
export const createAdminClusterResponseSchema =
  createStandardSuccessEnvelopeSchema(adminClusterSchema);
export const getAdminClusterParamsSchema = idParamsSchema;
export const getAdminClusterResponseSchema =
  createStandardSuccessEnvelopeSchema(adminClusterSchema);
export const updateAdminClusterParamsSchema = idParamsSchema;
export const updateAdminClusterResponseSchema =
  createStandardSuccessEnvelopeSchema(adminClusterSchema);
export const publishAdminClusterParamsSchema = idParamsSchema;
export const publishAdminClusterResponseSchema =
  createStandardSuccessEnvelopeSchema(adminClusterSchema);
export const unpublishAdminClusterParamsSchema = idParamsSchema;
export const unpublishAdminClusterResponseSchema =
  createStandardSuccessEnvelopeSchema(adminClusterSchema);

export const getAdminFactoriesQuerySchema = paginationQuerySchema;
export const getAdminFactoriesResponseSchema =
  createPaginatedSuccessEnvelopeSchema(z.array(adminFactoryListItemSchema));
export const createAdminFactoryResponseSchema =
  createStandardSuccessEnvelopeSchema(adminFactorySchema);
export const getAdminFactoryParamsSchema = idParamsSchema;
export const getAdminFactoryResponseSchema =
  createStandardSuccessEnvelopeSchema(adminFactorySchema);
export const updateAdminFactoryParamsSchema = idParamsSchema;
export const updateAdminFactoryResponseSchema =
  createStandardSuccessEnvelopeSchema(adminFactorySchema);
export const publishAdminFactoryParamsSchema = idParamsSchema;
export const publishAdminFactoryResponseSchema =
  createStandardSuccessEnvelopeSchema(adminFactorySchema);
export const unpublishAdminFactoryParamsSchema = idParamsSchema;
export const unpublishAdminFactoryResponseSchema =
  createStandardSuccessEnvelopeSchema(adminFactorySchema);
export const verifyAdminFactoryParamsSchema = idParamsSchema;
export const verifyAdminFactoryResponseSchema =
  createStandardSuccessEnvelopeSchema(adminFactorySchema);

export const createUploadPresignBodySchema = z.strictObject({
  kind: uploadKindSchema,
  entityId: coreIdSchema,
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine(
      (value) =>
        value !== "." &&
        value !== ".." &&
        !value.includes("/") &&
        !value.includes("\\"),
      "fileName must not contain a path",
    ),
  contentType: mediaContentTypeSchema,
  contentLength: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const uploadPresignDataSchema = z.strictObject({
  objectKey: objectKeySchema,
  uploadUrl: absoluteUrlSchema,
  method: z.literal("PUT"),
  headers: z.strictObject({
    "Content-Type": mediaContentTypeSchema,
  }),
  expiresAt: utcDateTimeSchema,
});

export const createUploadPresignResponseSchema =
  createStandardSuccessEnvelopeSchema(uploadPresignDataSchema);

import { z } from "zod";

import {
  publicCategoryTreeSchema,
  publicClusterDetailSchema,
  publicClusterSummarySchema,
  publicFactoryDetailSchema,
  publicFactorySummarySchema,
} from "./entities.js";
import {
  createPaginatedSuccessEnvelopeSchema,
  createStandardSuccessEnvelopeSchema,
} from "./envelope.js";
import {
  booleanQuerySchema,
  emptyRequestSchema,
  slugParamsSchema,
} from "./http-input.js";
import { paginationQuerySchema } from "./pagination.js";
import { coreIdSchema, slugSchema } from "./primitives.js";

export const getClustersQuerySchema = paginationQuerySchema
  .extend({
    category: slugSchema.optional(),
    region: coreIdSchema.optional(),
  })
  .strict();
export const getClustersResponseSchema = createPaginatedSuccessEnvelopeSchema(
  z.array(publicClusterSummarySchema),
);

export const getClusterParamsSchema = slugParamsSchema;
export const getClusterResponseSchema = createStandardSuccessEnvelopeSchema(
  publicClusterDetailSchema,
);

export const getClusterFactoriesParamsSchema = slugParamsSchema;
export const getClusterFactoriesQuerySchema = paginationQuerySchema;
export const getClusterFactoriesResponseSchema =
  createPaginatedSuccessEnvelopeSchema(z.array(publicFactorySummarySchema));

export const getFactoriesQuerySchema = paginationQuerySchema
  .extend({
    category: slugSchema.optional(),
    cluster: slugSchema.optional(),
    verified: booleanQuerySchema.optional(),
  })
  .strict();
export const getFactoriesResponseSchema = createPaginatedSuccessEnvelopeSchema(
  z.array(publicFactorySummarySchema),
);

export const getFactoryParamsSchema = slugParamsSchema;
export const getFactoryResponseSchema = createStandardSuccessEnvelopeSchema(
  publicFactoryDetailSchema,
);

export const searchQuerySchema = z.strictObject({
  q: z.string().trim().min(2).max(100),
});

export const categorySearchResultSchema = z.strictObject({
  type: z.literal("category"),
  id: coreIdSchema,
  slug: slugSchema,
  name: z.string().min(1),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/u)
    .nullable(),
});

export const clusterSearchResultSchema = z.strictObject({
  type: z.literal("cluster"),
  id: coreIdSchema,
  slug: slugSchema,
  name: z.string().min(1),
  centroid: publicClusterSummarySchema.shape.centroid,
  factoryCount: z.number().int().nonnegative(),
});

export const factorySearchResultSchema = z.strictObject({
  type: z.literal("factory"),
  id: coreIdSchema,
  slug: slugSchema,
  name: z.string().min(1),
  location: publicFactorySummarySchema.shape.location,
  verified: z.boolean(),
});

export const searchResultSchema = z.strictObject({
  categories: z.array(categorySearchResultSchema).max(5),
  clusters: z.array(clusterSearchResultSchema).max(5),
  factories: z.array(factorySearchResultSchema).max(5),
});
export const searchResponseSchema =
  createStandardSuccessEnvelopeSchema(searchResultSchema);

export const getCategoriesQuerySchema = emptyRequestSchema;
export const getCategoriesResponseSchema = createStandardSuccessEnvelopeSchema(
  z.array(publicCategoryTreeSchema),
);

import { z } from "zod";

import { favoriteItemSchema, userSchema } from "./entities.js";
import {
  createPaginatedSuccessEnvelopeSchema,
  createStandardSuccessEnvelopeSchema,
} from "./envelope.js";
import { favoriteTargetParamsSchema } from "./http-input.js";
import { paginationQuerySchema } from "./pagination.js";
import {
  coreIdSchema,
  favoriteTargetTypeSchema,
  localeSchema,
} from "./primitives.js";

export const getFavoritesQuerySchema = paginationQuerySchema;
export const getFavoritesResponseSchema = createPaginatedSuccessEnvelopeSchema(
  z.array(favoriteItemSchema),
);

export const createFavoriteBodySchema = z.strictObject({
  targetType: favoriteTargetTypeSchema,
  targetId: coreIdSchema,
});
export const createFavoriteResponseSchema =
  createStandardSuccessEnvelopeSchema(favoriteItemSchema);

export const deleteFavoriteParamsSchema = favoriteTargetParamsSchema;
export const deleteFavoriteReceiptSchema = z.strictObject({
  targetType: favoriteTargetTypeSchema,
  targetId: coreIdSchema,
  absent: z.literal(true),
});
export const deleteFavoriteResponseSchema = createStandardSuccessEnvelopeSchema(
  deleteFavoriteReceiptSchema,
);

export const updateMeBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).nullable().optional(),
    locale: localeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
export const updateMeResponseSchema =
  createStandardSuccessEnvelopeSchema(userSchema);

export const deleteMeReceiptSchema = z.strictObject({
  deletionRequested: z.literal(true),
});
export const deleteMeResponseSchema = createStandardSuccessEnvelopeSchema(
  deleteMeReceiptSchema,
);

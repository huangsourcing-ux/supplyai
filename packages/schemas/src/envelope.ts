import { z } from "zod";

import { cursorSchema } from "./pagination.js";

export const ApiErrorCode = {
  ValidationError: "VALIDATION_ERROR",
  NotFound: "NOT_FOUND",
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  RateLimited: "RATE_LIMITED",
  Internal: "INTERNAL",
} as const;

export const apiErrorCodeSchema = z.enum([
  ApiErrorCode.ValidationError,
  ApiErrorCode.NotFound,
  ApiErrorCode.Unauthorized,
  ApiErrorCode.Forbidden,
  ApiErrorCode.RateLimited,
  ApiErrorCode.Internal,
]);

export const apiErrorDetailSchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  path: z.array(z.union([z.string(), z.number().int()])),
});

export const apiErrorEnvelopeSchema = z.strictObject({
  data: z.null(),
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    details: z.array(apiErrorDetailSchema),
  }),
  meta: z.null(),
});

export const emptyMetaSchema = z.strictObject({});
export const paginationMetaSchema = z.strictObject({
  nextCursor: cursorSchema.nullable(),
});
export const mapTruncationMetaSchema = z.strictObject({
  truncated: z.boolean(),
});

export function createSuccessEnvelopeSchema<
  Data extends z.ZodType,
  Meta extends z.ZodType,
>(data: Data, meta: Meta) {
  return z.strictObject({
    data,
    error: z.null(),
    meta,
  });
}

export function createStandardSuccessEnvelopeSchema<Data extends z.ZodType>(
  data: Data,
) {
  return createSuccessEnvelopeSchema(data, emptyMetaSchema);
}

export function createPaginatedSuccessEnvelopeSchema<Data extends z.ZodType>(
  data: Data,
) {
  return createSuccessEnvelopeSchema(data, paginationMetaSchema);
}

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;
export type ApiSuccessEnvelope<Data, Meta = Record<string, never>> = {
  data: Data;
  error: null;
  meta: Meta;
};

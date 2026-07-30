import { z } from "zod";

import {
  MAX_UPLOAD_BYTES,
  mediaContentTypeSchema,
  objectKeySchema,
} from "./primitives.js";

export const cmsMediaPresignRequestSchema = z.strictObject({
  collectionSlug: z.literal("media"),
  docPrefix: z.literal("articles"),
  filename: z.string().trim().min(1).max(255),
  filesize: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  mimeType: mediaContentTypeSchema,
});

export const cmsMediaPresignResponseSchema = z.strictObject({
  docPrefix: z.string().min(1),
  filename: z.string().min(1),
  url: z.url(),
  objectKey: objectKeySchema,
  expiresAt: z.iso.datetime({ offset: true }),
});

export type CmsMediaPresignRequest = z.infer<
  typeof cmsMediaPresignRequestSchema
>;
export type CmsMediaPresignResponse = z.infer<
  typeof cmsMediaPresignResponseSchema
>;

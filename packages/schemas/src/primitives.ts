import { z } from "zod";

export const CORE_ID_LENGTH = 21;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const coreIdSchema = z
  .string()
  .length(CORE_ID_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

export const utcDateTimeSchema = z.iso.datetime({ offset: false });
export const absoluteUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "URL must use HTTP or HTTPS");

export const publicationStatusSchema = z.enum(["draft", "published"]);
export const favoriteTargetTypeSchema = z.enum(["factory", "cluster"]);
export const regionLevelSchema = z.enum(["province", "city", "county"]);
export const localeSchema = z.literal("en");

export const mediaContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const uploadKindSchema = z.enum(["cluster-cover", "factory-image"]);

export const objectKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      !value.includes("\\") &&
      !value.split("/").includes(".."),
    "Invalid object key",
  );

export type FavoriteTargetType = z.infer<typeof favoriteTargetTypeSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type MediaContentType = z.infer<typeof mediaContentTypeSchema>;
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;
export type RegionLevel = z.infer<typeof regionLevelSchema>;
export type UploadKind = z.infer<typeof uploadKindSchema>;

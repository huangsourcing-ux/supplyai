import { APIError, type CollectionConfig } from "payload";

import {
  buildCmsMediaObjectKey,
  getCmsMediaPrefix,
  isOwnedCmsMediaObjectKey,
  verifyCmsMediaObject,
} from "./media-storage";

interface MediaRecord {
  filename?: null | string;
  filesize?: null | number;
  mimeType?: null | string;
  objectKey?: null | string;
  prefix?: null | string;
}

function isApprovedClientUploadFile(file: {
  clientUploadContext?: unknown;
}): boolean {
  const context = file.clientUploadContext;
  if (
    context === null ||
    typeof context !== "object" ||
    Array.isArray(context)
  ) {
    return false;
  }

  const fields = Object.keys(context);
  return (
    fields.length === 1 &&
    fields[0] === "prefix" &&
    (context as { prefix?: unknown }).prefix === getCmsMediaPrefix()
  );
}

function requireUploadMetadata(data: MediaRecord): {
  filename: string;
  filesize: number;
  mimeType: string;
  objectKey: string;
} {
  if (
    typeof data.filename !== "string" ||
    typeof data.filesize !== "number" ||
    typeof data.mimeType !== "string" ||
    data.prefix !== getCmsMediaPrefix()
  ) {
    throw new APIError("CMS client upload metadata is required", 400);
  }

  const objectKey = buildCmsMediaObjectKey(data.filename);
  if (!isOwnedCmsMediaObjectKey(objectKey)) {
    throw new APIError("CMS media filename is invalid", 400);
  }

  return {
    ...data,
    filename: data.filename,
    filesize: data.filesize,
    mimeType: data.mimeType,
    objectKey,
  };
}

export const mediaHooks: NonNullable<CollectionConfig["hooks"]> = {
  beforeDelete: [
    async ({ id, req }) => {
      const references = await req.payload.count({
        collection: "articles",
        overrideAccess: true,
        req,
        where: { cover: { equals: id } },
      });
      if (references.totalDocs > 0) {
        throw new APIError(
          "Media referenced by an article cannot be deleted",
          409,
        );
      }
    },
  ],
  beforeOperation: [
    ({ args, operation, req }) => {
      if (
        (operation === "create" || operation === "update") &&
        req.file &&
        !isApprovedClientUploadFile(req.file)
      ) {
        throw new APIError(
          "Binary multipart and server-side CMS uploads are not allowed",
          400,
        );
      }
      return args;
    },
  ],
  beforeValidate: [
    ({ data, operation, originalDoc, req }) => {
      if (!data) return data;
      const next = data as MediaRecord;
      const original = (originalDoc ?? {}) as MediaRecord;

      if (operation === "update") {
        for (const field of [
          "filename",
          "filesize",
          "mimeType",
          "objectKey",
          "prefix",
        ] as const) {
          if (next[field] !== undefined && next[field] !== original[field]) {
            throw new APIError("CMS upload metadata is immutable", 400);
          }
        }
        next.objectKey = original.objectKey;
        return next;
      }

      if (!req.file || !isApprovedClientUploadFile(req.file)) {
        throw new APIError("CMS client upload metadata is required", 400);
      }

      // Payload keeps the collection-level prefix in form data, while the
      // official client upload handler returns the full environment-owned
      // prefix on req.file.clientUploadContext after the signed PUT.
      next.prefix = getCmsMediaPrefix();
      const upload = requireUploadMetadata(next);
      next.objectKey = upload.objectKey;
      return next;
    },
  ],
  beforeChange: [
    async ({ data, operation }) => {
      if (operation !== "create") return data;
      const upload = requireUploadMetadata(data as MediaRecord);
      await verifyCmsMediaObject({
        contentLength: upload.filesize,
        contentType: upload.mimeType,
        objectKey: upload.objectKey,
      });
      return data;
    },
  ],
};

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  MAX_UPLOAD_BYTES,
  mediaContentTypeSchema,
  type MediaContentType,
} from "@chinasupply/schemas";
import { nanoid } from "nanoid";
import { APIError } from "payload";

import { payloadEnvironment } from "@/env/payload";

export const CMS_MEDIA_PRESIGN_TTL_SECONDS = 5 * 60;

const extensionByMimeType: Record<MediaContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let storageClient: S3Client | null = null;

function requireMediaStorage() {
  if (payloadEnvironment.mediaStorage === null) {
    throw new APIError("CMS media storage is not configured", 503);
  }

  return payloadEnvironment.mediaStorage;
}

export function getCmsMediaStorageClient(): S3Client {
  const storage = requireMediaStorage();

  storageClient ??= new S3Client({
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
    endpoint: storage.endpoint,
    forcePathStyle: true,
    region: "auto",
  });

  return storageClient;
}

export function getCmsMediaPrefix(): string {
  const prefix = requireMediaStorage().prefix.replace(/^\/+|\/+$/gu, "");
  return [prefix, "articles"].filter(Boolean).join("/");
}

export function createCmsMediaFilename(contentType: MediaContentType): string {
  return `media-${nanoid()}.${extensionByMimeType[contentType]}`;
}

export function buildCmsMediaObjectKey(filename: string): string {
  return `${getCmsMediaPrefix()}/${filename}`;
}

export function isOwnedCmsMediaObjectKey(objectKey: string): boolean {
  const prefix = getCmsMediaPrefix().replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `^${prefix}/media-[A-Za-z0-9_-]{21}\\.(?:jpg|png|webp)$`,
    "u",
  ).test(objectKey);
}

export function buildCmsMediaCdnUrl(objectKey: string): string {
  const storage = requireMediaStorage();
  const encodedKey = objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${storage.cdnBaseUrl}/${encodedKey}`;
}

function normalizedMimeType(value: string | undefined): string | undefined {
  return value?.split(";", 1)[0]?.trim().toLowerCase();
}

export function validateCmsMediaReference(input: {
  contentLength: number;
  contentType: string;
  objectKey: string;
}): MediaContentType {
  const expectedContentType = mediaContentTypeSchema.safeParse(
    input.contentType,
  );
  if (
    !expectedContentType.success ||
    input.contentLength < 1 ||
    input.contentLength > MAX_UPLOAD_BYTES ||
    !isOwnedCmsMediaObjectKey(input.objectKey)
  ) {
    throw new APIError("CMS media metadata is invalid", 400);
  }

  const expectedExtension = extensionByMimeType[expectedContentType.data];
  if (!input.objectKey.endsWith(`.${expectedExtension}`)) {
    throw new APIError("CMS media metadata is invalid", 400);
  }

  return expectedContentType.data;
}

export function assertCmsMediaHeadMatches(
  input: { contentLength: number; contentType: MediaContentType },
  head: { ContentLength?: number; ContentType?: string },
): void {
  if (
    normalizedMimeType(head.ContentType) !== input.contentType ||
    head.ContentLength !== input.contentLength
  ) {
    throw new APIError("CMS media object metadata does not match", 400);
  }
}

export async function verifyCmsMediaObject(input: {
  contentLength: number;
  contentType: string;
  objectKey: string;
}): Promise<void> {
  const storage = requireMediaStorage();
  const expectedContentType = validateCmsMediaReference(input);

  let head;
  try {
    head = await getCmsMediaStorageClient().send(
      new HeadObjectCommand({
        Bucket: storage.bucket,
        Key: input.objectKey,
      }),
    );
  } catch {
    throw new APIError("CMS media object was not found", 400);
  }

  assertCmsMediaHeadMatches(
    { contentLength: input.contentLength, contentType: expectedContentType },
    head,
  );
}

export async function createCmsMediaUpload(input: {
  contentLength: number;
  contentType: MediaContentType;
}): Promise<{
  expiresAt: string;
  filename: string;
  objectKey: string;
  uploadUrl: string;
}> {
  const storage = requireMediaStorage();
  const filename = createCmsMediaFilename(input.contentType);
  const objectKey = buildCmsMediaObjectKey(filename);
  const uploadUrl = await getSignedUrl(
    getCmsMediaStorageClient(),
    new PutObjectCommand({
      Bucket: storage.bucket,
      ContentLength: input.contentLength,
      ContentType: input.contentType,
      Key: objectKey,
    }),
    {
      expiresIn: CMS_MEDIA_PRESIGN_TTL_SECONDS,
      signableHeaders: new Set(["content-length", "content-type"]),
    },
  );

  return {
    expiresAt: new Date(
      Date.now() + CMS_MEDIA_PRESIGN_TTL_SECONDS * 1000,
    ).toISOString(),
    filename,
    objectKey,
    uploadUrl,
  };
}

export function resetCmsMediaStorageClientForTests(): void {
  storageClient = null;
}

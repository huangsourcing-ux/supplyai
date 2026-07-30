import {
  createUploadPresign,
  type CreateUploadPresign200,
  type CreateUploadPresignBody,
  type GetAdminFactory200DataImagesItem,
  type UpdateAdminFactoryBody,
} from "@chinasupply/api-client";

export const ADMIN_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const ADMIN_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AdminMediaType = (typeof ADMIN_MEDIA_TYPES)[number];
type FactoryImageReference = NonNullable<
  UpdateAdminFactoryBody["images"]
>[number];

export class AdminMediaError extends Error {
  constructor(
    message: string,
    readonly stage: "presign" | "put" | "validation",
  ) {
    super(message);
    this.name = "AdminMediaError";
  }
}

export function validateAdminMediaFile(
  file: Pick<File, "name" | "size" | "type">,
): asserts file is Pick<File, "name" | "size" | "type"> & {
  type: AdminMediaType;
} {
  if (!ADMIN_MEDIA_TYPES.includes(file.type as AdminMediaType)) {
    throw new AdminMediaError(
      "Choose a JPEG, PNG, or WebP image.",
      "validation",
    );
  }
  if (file.size < 1 || file.size > ADMIN_MEDIA_MAX_BYTES) {
    throw new AdminMediaError(
      "Image size must be from 1 byte to 10 MB.",
      "validation",
    );
  }
  if (file.name.trim() === "") {
    throw new AdminMediaError("The image file name is required.", "validation");
  }
}

export async function uploadAdminMediaObject({
  entityId,
  fetchImplementation = fetch,
  file,
  kind,
  presign = createUploadPresign,
  request,
}: {
  entityId: string;
  fetchImplementation?: typeof fetch;
  file: File;
  kind: CreateUploadPresignBody["kind"];
  presign?: (
    body: CreateUploadPresignBody,
    options?: RequestInit,
  ) => Promise<CreateUploadPresign200>;
  request: RequestInit;
}): Promise<string> {
  validateAdminMediaFile(file);

  let signed: CreateUploadPresign200;
  try {
    signed = await presign(
      {
        contentLength: file.size,
        contentType: file.type,
        entityId,
        fileName: file.name,
        kind,
      },
      request,
    );
  } catch {
    throw new AdminMediaError("The upload could not be prepared.", "presign");
  }

  const response = await fetchImplementation(signed.data.uploadUrl, {
    body: file,
    credentials: "omit",
    headers: { "Content-Type": signed.data.headers["Content-Type"] },
    method: signed.data.method,
  });
  if (!response.ok) {
    throw new AdminMediaError("The image upload failed.", "put");
  }

  return signed.data.objectKey;
}

export function toFactoryImageReferences(
  images: readonly GetAdminFactory200DataImagesItem[],
): FactoryImageReference[] {
  return images.map(({ alt, objectKey }) => ({ alt: { ...alt }, objectKey }));
}

export function appendFactoryImage(
  images: readonly FactoryImageReference[],
  image: FactoryImageReference,
): FactoryImageReference[] {
  return [...images, image];
}

export function updateFactoryImageAlt(
  images: readonly FactoryImageReference[],
  index: number,
  alt: { en: string; zh: string },
): FactoryImageReference[] {
  return images.map((image, currentIndex) =>
    currentIndex === index ? { ...image, alt } : image,
  );
}

export function moveFactoryImage(
  images: readonly FactoryImageReference[],
  index: number,
  direction: -1 | 1,
): FactoryImageReference[] {
  const destination = index + direction;
  if (
    index < 0 ||
    index >= images.length ||
    destination < 0 ||
    destination >= images.length
  ) {
    return [...images];
  }
  const next = [...images];
  [next[index], next[destination]] = [next[destination]!, next[index]!];
  return next;
}

export function removeFactoryImage(
  images: readonly FactoryImageReference[],
  index: number,
): FactoryImageReference[] {
  return images.filter((_, currentIndex) => currentIndex !== index);
}

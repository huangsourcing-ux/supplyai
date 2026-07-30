import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { parsePublicMediaStorageEnv } from "@chinasupply/config/env/api";
import {
  MAX_UPLOAD_BYTES,
  mediaContentTypeSchema,
  objectKeySchema,
  type MediaContentType,
  type UploadKind,
} from "@chinasupply/schemas";
import {
  BadRequestException,
  Inject,
  Injectable,
  type OnModuleDestroy,
} from "@nestjs/common";
import { nanoid } from "nanoid";

export const PUBLIC_MEDIA_STORAGE_CONFIG = Symbol(
  "PUBLIC_MEDIA_STORAGE_CONFIG",
);

export const MEDIA_UPLOAD_PRESIGN_TTL_SECONDS = 300;

export type PublicMediaStorageConfig = ReturnType<
  typeof parsePublicMediaStorageEnv
>;

const mediaExtensions: Record<MediaContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const kindPaths: Record<UploadKind, { directory: string; stem: string }> = {
  "cluster-cover": { directory: "clusters", stem: "cover" },
  "factory-image": { directory: "factories", stem: "image" },
};

function withPrefix(prefix: string, value: string): string {
  return prefix.length === 0 ? value : `${prefix}/${value}`;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMissingObjectError(error: unknown): boolean {
  if (!isObjectRecord(error)) {
    return false;
  }

  if (error.name === "NotFound" || error.name === "NoSuchKey") {
    return true;
  }

  const metadata = error.$metadata;
  return isObjectRecord(metadata) && metadata.httpStatusCode === 404;
}

export function createPublicMediaStorageClient(
  config: PublicMediaStorageConfig,
): S3Client {
  return new S3Client({
    region: "auto",
    endpoint:
      config.R2_ENDPOINT ??
      `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: config.R2_ENDPOINT !== undefined,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });
}

export function buildMediaObjectKey(input: {
  config: Pick<PublicMediaStorageConfig, "R2_PREFIX">;
  contentType: MediaContentType;
  entityId: string;
  kind: UploadKind;
  uploadId?: string;
}): string {
  const path = kindPaths[input.kind];
  const uploadId = input.uploadId ?? nanoid(21);
  return objectKeySchema.parse(
    withPrefix(
      input.config.R2_PREFIX,
      `${path.directory}/${input.entityId}/${path.stem}-${uploadId}.${mediaExtensions[input.contentType]}`,
    ),
  );
}

export function isOwnedMediaObjectKey(input: {
  config: Pick<PublicMediaStorageConfig, "R2_PREFIX">;
  entityId: string;
  kind: UploadKind;
  objectKey: string;
}): boolean {
  if (!objectKeySchema.safeParse(input.objectKey).success) {
    return false;
  }

  const path = kindPaths[input.kind];
  const expectedDirectory = withPrefix(
    input.config.R2_PREFIX,
    `${path.directory}/${input.entityId}/`,
  );
  if (!input.objectKey.startsWith(expectedDirectory)) {
    return false;
  }

  const fileName = input.objectKey.slice(expectedDirectory.length);
  return new RegExp(
    `^${path.stem}-[A-Za-z0-9_-]{21}\\.(?:jpg|png|webp)$`,
    "u",
  ).test(fileName);
}

@Injectable()
export class MediaObjectStorageService implements OnModuleDestroy {
  private readonly client: S3Client;

  constructor(
    @Inject(PUBLIC_MEDIA_STORAGE_CONFIG)
    private readonly config: PublicMediaStorageConfig,
  ) {
    this.client = createPublicMediaStorageClient(config);
  }

  async createPresignedUpload(input: {
    contentType: MediaContentType;
    entityId: string;
    kind: UploadKind;
  }) {
    const objectKey = buildMediaObjectKey({ config: this.config, ...input });
    const expiresAt = new Date(
      Date.now() + MEDIA_UPLOAD_PRESIGN_TTL_SECONDS * 1_000,
    ).toISOString();
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.R2_MEDIA_BUCKET,
        ContentType: input.contentType,
        Key: objectKey,
      }),
      {
        expiresIn: MEDIA_UPLOAD_PRESIGN_TTL_SECONDS,
        signableHeaders: new Set(["content-type"]),
      },
    );

    return {
      expiresAt,
      headers: { "Content-Type": input.contentType },
      method: "PUT" as const,
      objectKey,
      uploadUrl,
    };
  }

  async assertValidReference(input: {
    entityId: string;
    kind: UploadKind;
    objectKey: string;
  }): Promise<void> {
    if (!isOwnedMediaObjectKey({ config: this.config, ...input })) {
      throw new BadRequestException(
        "Media objectKey does not belong to this entity and environment",
      );
    }

    let metadata;
    try {
      metadata = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.R2_MEDIA_BUCKET,
          Key: input.objectKey,
        }),
      );
    } catch (error) {
      if (isMissingObjectError(error)) {
        throw new BadRequestException("Referenced media object does not exist");
      }
      throw error;
    }

    const contentType = mediaContentTypeSchema.safeParse(metadata.ContentType);
    if (!contentType.success) {
      throw new BadRequestException(
        "Referenced media object has an unsupported content type",
      );
    }

    const contentLength = metadata.ContentLength;
    if (
      contentLength === undefined ||
      contentLength < 1 ||
      contentLength > MAX_UPLOAD_BYTES
    ) {
      throw new BadRequestException(
        "Referenced media object has an invalid content length",
      );
    }

    if (!input.objectKey.endsWith(`.${mediaExtensions[contentType.data]}`)) {
      throw new BadRequestException(
        "Referenced media object content type does not match its key",
      );
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}

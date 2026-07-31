import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { parsePrivateObjectStorageEnv } from "@chinasupply/config/env/api";
import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

export const PRIVATE_OBJECT_STORAGE_CONFIG = Symbol(
  "PRIVATE_OBJECT_STORAGE_CONFIG",
);

export type PrivateObjectStorageConfig = ReturnType<
  typeof parsePrivateObjectStorageEnv
>;

export function createPrivateObjectStorageClient(
  config: PrivateObjectStorageConfig,
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

export interface PrivateObjectHead {
  contentLength: number;
  contentType: string | undefined;
  lastModified: Date | undefined;
  metadata: Record<string, string>;
}

export interface PrivateObjectSummary {
  key: string;
  lastModified: Date;
  size: number;
}

@Injectable()
export class PrivateObjectStorageService implements OnModuleDestroy {
  private readonly client: S3Client;

  constructor(
    @Inject(PRIVATE_OBJECT_STORAGE_CONFIG)
    private readonly config: PrivateObjectStorageConfig,
  ) {
    this.client = createPrivateObjectStorageClient(config);
  }

  async getText(objectKey: string, abortSignal?: AbortSignal): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.R2_PRIVATE_BUCKET,
        Key: objectKey,
      }),
      { abortSignal },
    );

    if (response.Body === undefined) {
      throw new Error(`Private object has no body: ${objectKey}`);
    }

    return response.Body.transformToString();
  }

  async put(
    objectKey: string,
    body: string | Uint8Array,
    contentType: string,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.R2_PRIVATE_BUCKET,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
      }),
      { abortSignal },
    );
  }

  async putFile(
    objectKey: string,
    filePath: string,
    contentType: string,
    metadata: Record<string, string>,
    abortSignal?: AbortSignal,
  ): Promise<number> {
    const file = await stat(filePath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.R2_PRIVATE_BUCKET,
        Key: objectKey,
        Body: createReadStream(filePath),
        ContentLength: file.size,
        ContentType: contentType,
        Metadata: metadata,
      }),
      { abortSignal },
    );
    return file.size;
  }

  async downloadToFile(
    objectKey: string,
    filePath: string,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.R2_PRIVATE_BUCKET,
        Key: objectKey,
      }),
      { abortSignal },
    );
    if (response.Body === undefined) {
      throw new Error(`Private object has no body: ${objectKey}`);
    }

    await pipeline(
      response.Body as NodeJS.ReadableStream,
      createWriteStream(filePath, { flags: "wx", mode: 0o600 }),
    );
  }

  async head(
    objectKey: string,
    abortSignal?: AbortSignal,
  ): Promise<PrivateObjectHead> {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.R2_PRIVATE_BUCKET,
        Key: objectKey,
      }),
      { abortSignal },
    );
    return {
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata ?? {},
    };
  }

  async list(
    prefix: string,
    abortSignal?: AbortSignal,
  ): Promise<PrivateObjectSummary[]> {
    const objects: PrivateObjectSummary[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.R2_PRIVATE_BUCKET,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
        { abortSignal },
      );
      for (const object of response.Contents ?? []) {
        if (
          object.Key === undefined ||
          object.LastModified === undefined ||
          object.Size === undefined
        ) {
          throw new Error(
            "Private object listing returned incomplete metadata",
          );
        }
        objects.push({
          key: object.Key,
          lastModified: object.LastModified,
          size: object.Size,
        });
      }
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
      if (response.IsTruncated && continuationToken === undefined) {
        throw new Error(
          "Private object listing was truncated without a continuation token",
        );
      }
    } while (continuationToken !== undefined);

    return objects;
  }

  async deleteMany(
    objectKeys: readonly string[],
    abortSignal?: AbortSignal,
  ): Promise<void> {
    for (let index = 0; index < objectKeys.length; index += 1_000) {
      const keys = objectKeys.slice(index, index + 1_000);
      if (keys.length === 0) {
        continue;
      }
      const response = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.config.R2_PRIVATE_BUCKET,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
        { abortSignal },
      );
      if ((response.Errors?.length ?? 0) > 0) {
        throw new Error(
          `Private object deletion failed for ${response.Errors?.length ?? 0} object(s)`,
        );
      }
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}

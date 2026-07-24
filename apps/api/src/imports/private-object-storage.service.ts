import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { parsePrivateObjectStorageEnv } from "@chinasupply/config/env/api";

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

@Injectable()
export class PrivateObjectStorageService implements OnModuleDestroy {
  private readonly client: S3Client;

  constructor(
    @Inject(PRIVATE_OBJECT_STORAGE_CONFIG)
    private readonly config: PrivateObjectStorageConfig,
  ) {
    this.client = createPrivateObjectStorageClient(config);
  }

  async getText(objectKey: string): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.R2_PRIVATE_BUCKET,
        Key: objectKey,
      }),
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
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.R2_PRIVATE_BUCKET,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}

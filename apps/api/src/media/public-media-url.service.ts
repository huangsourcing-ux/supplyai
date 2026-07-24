import { absoluteUrlSchema, objectKeySchema } from "@chinasupply/schemas";
import { Inject, Injectable } from "@nestjs/common";

import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";

export function joinPublicMediaUrl(
  cdnBaseUrl: string,
  objectKey: string,
): string {
  const validObjectKey = objectKeySchema.parse(objectKey);
  const encodedObjectKey = validObjectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const normalizedBaseUrl = `${cdnBaseUrl.replace(/\/+$/u, "")}/`;

  return absoluteUrlSchema.parse(
    new URL(encodedObjectKey, normalizedBaseUrl).toString(),
  );
}

@Injectable()
export class PublicMediaUrlService {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  resolve(objectKey: string | null): string | null {
    return objectKey === null
      ? null
      : joinPublicMediaUrl(this.config.R2_CDN_BASE_URL, objectKey);
  }
}

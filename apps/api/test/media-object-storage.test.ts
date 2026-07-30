import { describe, expect, it } from "vitest";

import {
  buildMediaObjectKey,
  isOwnedMediaObjectKey,
} from "../src/media/media-object-storage.service.js";

const entityId = "factorymedia000000000";
const otherEntityId = "factorymedia000000001";
const uploadId = "uploadmedia0000000000";

describe("media object keys", () => {
  it("builds deterministic environment- and entity-owned paths", () => {
    expect(
      buildMediaObjectKey({
        config: { R2_PREFIX: "staging" },
        contentType: "image/jpeg",
        entityId,
        kind: "factory-image",
        uploadId,
      }),
    ).toBe(`staging/factories/${entityId}/image-${uploadId}.jpg`);
    expect(
      buildMediaObjectKey({
        config: { R2_PREFIX: "" },
        contentType: "image/webp",
        entityId,
        kind: "cluster-cover",
        uploadId,
      }),
    ).toBe(`clusters/${entityId}/cover-${uploadId}.webp`);
  });

  it("accepts only the expected environment, entity, kind, and key shape", () => {
    const objectKey = `dev/factories/${entityId}/image-${uploadId}.png`;
    expect(
      isOwnedMediaObjectKey({
        config: { R2_PREFIX: "dev" },
        entityId,
        kind: "factory-image",
        objectKey,
      }),
    ).toBe(true);

    for (const invalid of [
      { entityId: otherEntityId, objectKey },
      { entityId, objectKey: objectKey.replace("dev/", "staging/") },
      { entityId, objectKey: objectKey.replace("image-", "cover-") },
      { entityId, objectKey: objectKey.replace(uploadId, "short") },
      { entityId, objectKey: `${objectKey}/nested` },
    ]) {
      expect(
        isOwnedMediaObjectKey({
          config: { R2_PREFIX: "dev" },
          entityId: invalid.entityId,
          kind: "factory-image",
          objectKey: invalid.objectKey,
        }),
      ).toBe(false);
    }
  });
});

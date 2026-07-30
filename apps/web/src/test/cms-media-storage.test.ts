import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIError } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env/payload", () => ({
  payloadEnvironment: {
    mediaStorage: {
      accessKeyId: "test-access-key",
      accountId: "test-account",
      bucket: "test-media",
      cdnBaseUrl: "https://cdn.example.com",
      endpoint: "https://r2.example.com",
      prefix: "staging",
      secretAccessKey: "test-secret-key",
    },
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://r2.example.com/signed-put"),
}));

import {
  assertCmsMediaHeadMatches,
  buildCmsMediaCdnUrl,
  buildCmsMediaObjectKey,
  CMS_MEDIA_PRESIGN_TTL_SECONDS,
  createCmsMediaUpload,
  isOwnedCmsMediaObjectKey,
  resetCmsMediaStorageClientForTests,
  validateCmsMediaReference,
  verifyCmsMediaObject,
} from "../cms/media-storage";

beforeEach(() => {
  resetCmsMediaStorageClientForTests();
  vi.clearAllMocks();
});

describe("Payload R2 media storage", () => {
  it("generates server-owned environment keys and a five-minute signed PUT", async () => {
    const before = Date.now();
    const upload = await createCmsMediaUpload({
      contentLength: 1234,
      contentType: "image/webp",
    });

    expect(upload.filename).toMatch(/^media-[A-Za-z0-9_-]{21}\.webp$/u);
    expect(upload.objectKey).toBe(`staging/articles/${upload.filename}`);
    expect(upload.uploadUrl).toBe("https://r2.example.com/signed-put");
    expect(new Date(upload.expiresAt).getTime()).toBeGreaterThanOrEqual(
      before + CMS_MEDIA_PRESIGN_TTL_SECONDS * 1000 - 100,
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.objectContaining({
        input: expect.objectContaining({
          ContentLength: 1234,
          ContentType: "image/webp",
          Key: upload.objectKey,
        }),
      }),
      {
        expiresIn: CMS_MEDIA_PRESIGN_TTL_SECONDS,
        signableHeaders: new Set(["content-length", "content-type"]),
      },
    );
  });

  it("derives CDN URLs without storing credentials or the full URL in objectKey", () => {
    const key = buildCmsMediaObjectKey("media-123456789012345678901.jpg");
    expect(key).toBe("staging/articles/media-123456789012345678901.jpg");
    expect(isOwnedCmsMediaObjectKey(key)).toBe(true);
    expect(buildCmsMediaCdnUrl(key)).toBe(
      "https://cdn.example.com/staging/articles/media-123456789012345678901.jpg",
    );
    expect(isOwnedCmsMediaObjectKey("production/articles/media-bad.jpg")).toBe(
      false,
    );
  });

  it("rejects wrong environment keys, size, MIME, and extension", () => {
    const valid = {
      contentLength: 100,
      contentType: "image/png",
      objectKey: "staging/articles/media-123456789012345678901.png",
    };
    expect(validateCmsMediaReference(valid)).toBe("image/png");
    expect(() =>
      validateCmsMediaReference({ ...valid, contentLength: 0 }),
    ).toThrow(APIError);
    expect(() =>
      validateCmsMediaReference({ ...valid, contentType: "image/gif" }),
    ).toThrow(APIError);
    expect(() =>
      validateCmsMediaReference({
        ...valid,
        objectKey: "dev/articles/media-123456789012345678901.png",
      }),
    ).toThrow(APIError);
    expect(() =>
      validateCmsMediaReference({
        ...valid,
        objectKey: "staging/articles/media-123456789012345678901.jpg",
      }),
    ).toThrow(APIError);
  });

  it("checks HEAD MIME and actual byte count", () => {
    expect(() =>
      assertCmsMediaHeadMatches(
        { contentLength: 100, contentType: "image/png" },
        { ContentLength: 100, ContentType: "image/png; charset=binary" },
      ),
    ).not.toThrow();
    expect(() =>
      assertCmsMediaHeadMatches(
        { contentLength: 100, contentType: "image/png" },
        { ContentLength: 99, ContentType: "image/png" },
      ),
    ).toThrow(/does not match/);
    expect(() =>
      assertCmsMediaHeadMatches(
        { contentLength: 100, contentType: "image/png" },
        { ContentLength: 100, ContentType: "image/jpeg" },
      ),
    ).toThrow(/does not match/);
  });

  it("rejects missing R2 objects and accepts matching HEAD metadata", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    send.mockRejectedValueOnce(new Error("not found"));
    const input = {
      contentLength: 100,
      contentType: "image/png",
      objectKey: "staging/articles/media-123456789012345678901.png",
    };
    await expect(verifyCmsMediaObject(input)).rejects.toThrow(/not found/);

    send.mockResolvedValueOnce({
      ContentLength: 100,
      ContentType: "image/png",
    } as never);
    await expect(verifyCmsMediaObject(input)).resolves.toBeUndefined();
  });
});

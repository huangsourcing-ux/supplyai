import { describe, expect, it } from "vitest";

import {
  cmsMediaPresignRequestSchema,
  cmsMediaPresignResponseSchema,
} from "./cms-media.js";

describe("CMS media contracts", () => {
  it("accepts only media client uploads from 1 byte through 10 MB", () => {
    expect(
      cmsMediaPresignRequestSchema.parse({
        collectionSlug: "media",
        docPrefix: "articles",
        filename: "cover.webp",
        filesize: 1,
        mimeType: "image/webp",
      }),
    ).toMatchObject({
      collectionSlug: "media",
      docPrefix: "articles",
      filesize: 1,
    });

    expect(() =>
      cmsMediaPresignRequestSchema.parse({
        collectionSlug: "articles",
        docPrefix: "articles",
        filename: "cover.webp",
        filesize: 1,
        mimeType: "image/webp",
      }),
    ).toThrow();
    expect(() =>
      cmsMediaPresignRequestSchema.parse({
        collectionSlug: "media",
        docPrefix: "articles",
        filename: "cover.gif",
        filesize: 0,
        mimeType: "image/gif",
      }),
    ).toThrow();
    expect(() =>
      cmsMediaPresignRequestSchema.parse({
        collectionSlug: "media",
        docPrefix: "production/articles",
        filename: "cover.webp",
        filesize: 1,
        mimeType: "image/webp",
      }),
    ).toThrow();
  });

  it("keeps the server path and expiry explicit in the adapter response", () => {
    expect(
      cmsMediaPresignResponseSchema.parse({
        docPrefix: "staging/articles",
        expiresAt: "2026-07-30T12:05:00.000Z",
        filename: "media-123456789012345678901.webp",
        objectKey: "staging/articles/media-123456789012345678901.webp",
        url: "https://r2.example.com/signed-put",
      }),
    ).toMatchObject({ docPrefix: "staging/articles" });
  });
});

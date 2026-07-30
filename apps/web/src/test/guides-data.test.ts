import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  getPayload: vi.fn(),
}));

vi.mock("payload", () => ({ getPayload: mocks.getPayload }));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: unknown) => callback,
}));
vi.mock("@/cms/media-storage", () => ({
  buildCmsMediaCdnUrl: (key: string) => `https://cdn.example.com/${key}`,
}));

import {
  getPublishedGuideBySlug,
  getPublishedGuides,
} from "../app/(frontend)/guides/guide-data";

function article(id: number, slug: string, publishedAt: string) {
  return {
    _status: "published",
    body: {
      root: {
        children: [],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    },
    cover: {
      aiGenerated: false,
      alt: `${slug} cover`,
      createdAt: publishedAt,
      id,
      objectKey: `staging/articles/media-${"A".repeat(21)}.webp`,
      updatedAt: publishedAt,
    },
    createdAt: publishedAt,
    id,
    locale: "en",
    publishedAt,
    slug,
    title: slug,
    updatedAt: publishedAt,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPayload.mockResolvedValue({ find: mocks.find });
});

describe("published guides Local API queries", () => {
  it("requests all English published articles in reverse publication order", async () => {
    mocks.find.mockResolvedValueOnce({
      docs: [
        article(2, "newer-guide", "2026-07-30T12:00:00.000Z"),
        article(1, "older-guide", "2026-07-29T12:00:00.000Z"),
      ],
    });

    await expect(getPublishedGuides()).resolves.toMatchObject([
      { slug: "newer-guide" },
      { slug: "older-guide" },
    ]);
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "articles",
        overrideAccess: true,
        pagination: false,
        sort: "-publishedAt",
        where: {
          and: [
            { _status: { equals: "published" } },
            { locale: { equals: "en" } },
            { publishedAt: { exists: true } },
          ],
        },
      }),
    );
  });

  it("returns 404 data for draft or missing slugs through strict filters", async () => {
    mocks.find.mockResolvedValueOnce({ docs: [] });
    await expect(getPublishedGuideBySlug("draft-guide")).resolves.toBeNull();
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { slug: { equals: "draft-guide" } },
            { _status: { equals: "published" } },
            { locale: { equals: "en" } },
            { publishedAt: { exists: true } },
          ],
        },
      }),
    );
  });
});

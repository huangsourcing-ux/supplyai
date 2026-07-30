import { APIError } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertPublished: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  verifyMedia: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("@/cms/published-clusters", () => ({
  assertPublishedClusterCards: mocks.assertPublished,
}));
vi.mock("@/cms/media-storage", () => ({
  buildCmsMediaObjectKey: (filename: string) => `staging/articles/${filename}`,
  getCmsMediaPrefix: () => "staging/articles",
  isOwnedCmsMediaObjectKey: (key: string) =>
    /^staging\/articles\/media-[A-Za-z0-9_-]{21}\.(?:jpg|png|webp)$/u.test(key),
  verifyCmsMediaObject: mocks.verifyMedia,
}));

import { articleHooks } from "../cms/article-hooks";
import { mediaHooks } from "../cms/media-hooks";

function hookAt<T>(hooks: T[] | undefined, index = 0): T {
  const hook = hooks?.[index];
  if (!hook) throw new Error("Expected collection hook");
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertPublished.mockResolvedValue(undefined);
  mocks.verifyMedia.mockResolvedValue(undefined);
});

describe("Payload article lifecycle", () => {
  it("sets publishedAt once and verifies cover plus published cluster IDs", async () => {
    const beforeChange = hookAt(articleHooks.beforeChange);
    const findByID = vi.fn().mockResolvedValue({
      filesize: 1234,
      id: 7,
      mimeType: "image/webp",
      objectKey: "staging/articles/media-123456789012345678901.webp",
    });
    const data = {
      _status: "published",
      body: { root: { children: [] } },
      cover: 7,
    };
    const result = await beforeChange({
      data,
      originalDoc: { _status: "draft", publishedAt: null },
      req: { payload: { findByID } },
    } as never);

    expect(result).toMatchObject({
      _status: "published",
      publishedAt: expect.any(String),
    });
    expect(mocks.assertPublished).toHaveBeenCalledWith(data.body);
    expect(mocks.verifyMedia).toHaveBeenCalledWith({
      contentLength: 1234,
      contentType: "image/webp",
      objectKey: "staging/articles/media-123456789012345678901.webp",
    });

    const republished = await beforeChange({
      data: { _status: "published" },
      originalDoc: {
        _status: "draft",
        body: data.body,
        cover: 7,
        publishedAt: "2026-07-01T00:00:00.000Z",
      },
      req: { payload: { findByID } },
    } as never);
    expect(republished).toMatchObject({
      publishedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("allows drafts without public dependencies and blocks invalid publish", async () => {
    const beforeChange = hookAt(articleHooks.beforeChange);
    await expect(
      beforeChange({
        data: { _status: "draft" },
        originalDoc: {},
        req: {},
      } as never),
    ).resolves.toMatchObject({ _status: "draft" });
    expect(mocks.assertPublished).not.toHaveBeenCalled();

    mocks.assertPublished.mockRejectedValueOnce(
      new Error("Cluster Card references unpublished clusters"),
    );
    await expect(
      beforeChange({
        data: {
          _status: "published",
          body: { root: { children: [] } },
          cover: 7,
        },
        originalDoc: {},
        req: {
          payload: {
            findByID: vi.fn().mockResolvedValue({
              filesize: 1234,
              mimeType: "image/webp",
              objectKey: "staging/articles/media-123456789012345678901.webp",
            }),
          },
        },
      } as never),
    ).rejects.toThrow(APIError);
  });

  it("revalidates list and both old/new detail paths after slug changes", async () => {
    const afterChange = hookAt(articleHooks.afterChange);
    await afterChange({
      doc: { _status: "published", slug: "new-guide" },
      previousDoc: { _status: "published", slug: "old-guide" },
    } as never);
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/guides"],
      ["/guides/old-guide"],
      ["/guides/new-guide"],
    ]);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("guides", "max");
  });

  it("revalidates the published detail when an article is unpublished or deleted", async () => {
    const afterChange = hookAt(articleHooks.afterChange);
    await afterChange({
      doc: { _status: "draft", slug: "guide" },
      previousDoc: { _status: "published", slug: "guide" },
    } as never);
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/guides"],
      ["/guides/guide"],
    ]);

    vi.clearAllMocks();
    const afterDelete = hookAt(articleHooks.afterDelete);
    await afterDelete({ doc: { slug: "guide" } } as never);
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/guides"],
      ["/guides/guide"],
    ]);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("guides", "max");
  });
});

describe("Payload media lifecycle", () => {
  it("HEAD-verifies direct uploads and makes upload metadata immutable", async () => {
    const beforeValidate = hookAt(mediaHooks.beforeValidate);
    const beforeChange = hookAt(mediaHooks.beforeChange);
    const filename = "media-123456789012345678901.webp";
    const created = await beforeValidate({
      data: {
        filename,
        filesize: 1234,
        mimeType: "image/webp",
        prefix: "staging/articles",
      },
      operation: "create",
      originalDoc: undefined,
    } as never);
    expect(created).toMatchObject({
      objectKey: `staging/articles/${filename}`,
    });
    await beforeChange({ data: created, operation: "create" } as never);
    expect(mocks.verifyMedia).toHaveBeenCalledOnce();

    expect(() =>
      beforeValidate({
        data: { filesize: 999 },
        operation: "update",
        originalDoc: {
          filename,
          filesize: 1234,
          mimeType: "image/webp",
          objectKey: `staging/articles/${filename}`,
          prefix: "staging/articles",
        },
      } as never),
    ).toThrow(/immutable/);
  });

  it("allows signed client metadata but rejects server upload and referenced deletion", async () => {
    const beforeOperation = hookAt(mediaHooks.beforeOperation);
    expect(
      beforeOperation({
        args: { data: "client upload" },
        operation: "create",
        req: {
          file: {
            clientUploadContext: { prefix: "staging/articles" },
            name: "media-123456789012345678901.webp",
          },
        },
      } as never),
    ).toEqual({ data: "client upload" });
    expect(() =>
      beforeOperation({
        args: {},
        operation: "create",
        req: { file: { name: "bypass.webp" } },
      } as never),
    ).toThrow(/multipart/i);
    expect(() =>
      beforeOperation({
        args: {},
        operation: "create",
        req: {
          file: {
            clientUploadContext: { prefix: "production/articles" },
            name: "bypass.webp",
          },
        },
      } as never),
    ).toThrow(/multipart/i);

    const beforeDelete = hookAt(mediaHooks.beforeDelete);
    await expect(
      beforeDelete({
        id: 7,
        req: {
          payload: { count: vi.fn().mockResolvedValue({ totalDocs: 1 }) },
        },
      } as never),
    ).rejects.toThrow(/cannot be deleted/);
  });
});

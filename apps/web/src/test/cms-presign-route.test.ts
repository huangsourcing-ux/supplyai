import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createUpload: vi.fn(),
  getPayload: vi.fn(),
}));

vi.mock("payload", () => ({ getPayload: mocks.getPayload }));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@/env/payload", () => ({
  payloadEnvironment: { siteUrl: "https://staging.chinasupply.ai" },
}));
vi.mock("@/cms/media-storage", () => ({
  createCmsMediaUpload: mocks.createUpload,
  getCmsMediaPrefix: () => "staging/articles",
}));

import { POST } from "../app/(payload)/api/storage-s3-generate-signed-url/route";

function request(body: unknown, origin = "https://staging.chinasupply.ai") {
  return new Request(
    "https://staging.chinasupply.ai/api/storage-s3-generate-signed-url",
    {
      body: JSON.stringify(body),
      headers: {
        cookie: "payload-token=session",
        origin,
      },
      method: "POST",
    },
  );
}

const validBody = {
  collectionSlug: "media",
  filename: "cover.webp",
  filesize: 1234,
  mimeType: "image/webp",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPayload.mockResolvedValue({ auth: mocks.auth });
  mocks.auth.mockResolvedValue({ user: { id: 1 } });
  mocks.createUpload.mockResolvedValue({
    expiresAt: "2026-07-30T12:05:00.000Z",
    filename: "media-123456789012345678901.webp",
    objectKey: "staging/articles/media-123456789012345678901.webp",
    uploadUrl: "https://r2.example.com/credential-free-put",
  });
});

describe("CMS media presign route", () => {
  it("rejects cross-origin and anonymous requests", async () => {
    expect(
      (await POST(request(validBody, "https://evil.example"))).status,
    ).toBe(403);

    mocks.auth.mockResolvedValueOnce({ user: null });
    expect((await POST(request(validBody))).status).toBe(401);
  });

  it.each([
    [{ ...validBody, collectionSlug: "articles" }, "wrong collection"],
    [{ ...validBody, mimeType: "image/gif" }, "wrong MIME"],
    [{ ...validBody, filesize: 0 }, "zero bytes"],
    [{ ...validBody, filesize: 10 * 1024 * 1024 + 1 }, "oversize"],
    [{ ...validBody, docPrefix: "production/articles" }, "client path"],
  ])("rejects %s (%s)", async (body, _label) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.createUpload).not.toHaveBeenCalled();
  });

  it("returns only a server-generated key and credential-free PUT URL", async () => {
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      docPrefix: "staging/articles",
      expiresAt: "2026-07-30T12:05:00.000Z",
      filename: "media-123456789012345678901.webp",
      objectKey: "staging/articles/media-123456789012345678901.webp",
      url: "https://r2.example.com/credential-free-put",
    });
    expect(mocks.createUpload).toHaveBeenCalledWith({
      contentLength: 1234,
      contentType: "image/webp",
    });
  });
});

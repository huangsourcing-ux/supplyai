import { describe, expect, it } from "vitest";

import {
  type CursorPayload,
  cursorSchema,
  decodeCursor,
  encodeCursor,
  paginationQuerySchema,
  safeDecodeCursor,
} from "./pagination.js";

const payload: CursorPayload = {
  v: 1,
  sort: ["2026-07-23T12:00:00.000Z", "abcdefghijklmnopqrstu"],
};

const goldenCursor =
  "eyJ2IjoxLCJzb3J0IjpbIjIwMjYtMDctMjNUMTI6MDA6MDAuMDAwWiIsImFiY2RlZmdoaWprbG1ub3BxcnN0dSJdfQ";

function encodeRawCursor(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

describe("cursor contract", () => {
  it("encodes a stable unpadded Base64URL cursor and round-trips", () => {
    expect(encodeCursor(payload)).toBe(goldenCursor);
    expect(goldenCursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(goldenCursor).not.toContain("=");
    expect(decodeCursor(goldenCursor)).toEqual(payload);
    expect(cursorSchema.parse(goldenCursor)).toBe(goldenCursor);
  });

  it.each([
    "",
    "*not-base64*",
    "eA",
    btoa("not json").replaceAll("+", "-").replaceAll("/", "_"),
    encodeRawCursor({ v: 2, sort: payload.sort }),
    encodeRawCursor({ v: 1, sort: ["not-a-date", payload.sort[1]] }),
    encodeRawCursor({ v: 1, sort: [payload.sort[0], "short"] }),
  ])("rejects an invalid opaque cursor: %s", (cursor) => {
    expect(safeDecodeCursor(cursor).success).toBe(false);
  });

  it("applies the frozen pagination defaults and limits", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(paginationQuerySchema.parse({ limit: "100" })).toEqual({
      limit: 100,
    });
    expect(() => paginationQuerySchema.parse({ limit: "101" })).toThrow();
    expect(() => paginationQuerySchema.parse({ unexpected: true })).toThrow();
  });
});

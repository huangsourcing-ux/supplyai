import { describe, expect, it } from "vitest";

import { isProtectedOpsPath, isPublicOpsPath } from "../auth/ops-routes";

describe("operations route classification", () => {
  it.each([
    "/ops",
    "/ops/",
    "/ops/factories",
    "/ops/factories/abc",
    "/ops/forbidden/details",
  ])("protects %s", (pathname) => {
    expect(isProtectedOpsPath(pathname)).toBe(true);
  });

  it.each(["/ops/sign-in", "/ops/sign-in/verify", "/ops/forbidden"])(
    "keeps %s public",
    (pathname) => {
      expect(isPublicOpsPath(pathname)).toBe(true);
      expect(isProtectedOpsPath(pathname)).toBe(false);
    },
  );

  it.each(["/", "/operations", "/api", "/admin"])(
    "does not classify %s as an operations route",
    (pathname) => {
      expect(isProtectedOpsPath(pathname)).toBe(false);
      expect(isPublicOpsPath(pathname)).toBe(false);
    },
  );
});

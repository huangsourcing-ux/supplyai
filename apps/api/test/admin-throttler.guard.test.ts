import { InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { getAdminThrottleTracker } from "../src/rate-limit/admin-throttler.guard.js";

describe("getAdminThrottleTracker", () => {
  it("uses the authenticated administrator ID", () => {
    expect(
      getAdminThrottleTracker({ adminUserId: "user_admin_reviewer" }),
    ).toBe("user_admin_reviewer");
  });

  it("fails closed when authentication did not attach an administrator ID", () => {
    expect(() => getAdminThrottleTracker({})).toThrow(
      InternalServerErrorException,
    );
  });
});

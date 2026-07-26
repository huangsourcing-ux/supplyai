import { InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { getUserThrottleTracker } from "../src/rate-limit/user-throttler.guard.js";

describe("user write throttler tracker", () => {
  it("uses the authenticated synchronized user ID", () => {
    expect(getUserThrottleTracker({ userId: "user_one" })).toBe("user_one");
    expect(getUserThrottleTracker({ userId: "user_two" })).toBe("user_two");
  });

  it("fails closed when authentication did not attach a user", () => {
    expect(() => getUserThrottleTracker({})).toThrow(
      InternalServerErrorException,
    );
    expect(() => getUserThrottleTracker({ userId: "" })).toThrow(
      InternalServerErrorException,
    );
  });
});

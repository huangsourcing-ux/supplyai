import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";

import { responseWithMeta } from "../src/common/http/api-envelope.js";
import { ApiEnvelopeInterceptor } from "../src/common/http/api-envelope.interceptor.js";

describe("ApiEnvelopeInterceptor", () => {
  const interceptor = new ApiEnvelopeInterceptor();
  const context = {} as ExecutionContext;

  it("wraps successful values with empty metadata", async () => {
    const handler: CallHandler = { handle: () => of({ status: "ok" }) };

    await expect(
      firstValueFrom(interceptor.intercept(context, handler)),
    ).resolves.toEqual({
      data: { status: "ok" },
      error: null,
      meta: {},
    });
  });

  it("preserves explicit response metadata", async () => {
    const handler: CallHandler = {
      handle: () => of(responseWithMeta(["item"], { nextCursor: "cursor" })),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, handler)),
    ).resolves.toEqual({
      data: ["item"],
      error: null,
      meta: { nextCursor: "cursor" },
    });
  });
});

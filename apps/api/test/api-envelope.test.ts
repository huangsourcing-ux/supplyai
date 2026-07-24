import {
  createPaginatedSuccessEnvelopeSchema,
  createStandardSuccessEnvelopeSchema,
  encodeCursor,
} from "@chinasupply/schemas";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { responseWithMeta } from "../src/common/http/api-envelope.js";
import { ApiEnvelopeInterceptor } from "../src/common/http/api-envelope.interceptor.js";

describe("ApiEnvelopeInterceptor", () => {
  const interceptor = new ApiEnvelopeInterceptor();
  const context = {} as ExecutionContext;

  it("wraps successful values with empty metadata", async () => {
    const handler: CallHandler = { handle: () => of({ status: "ok" }) };

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result).toEqual({
      data: { status: "ok" },
      error: null,
      meta: {},
    });
    expect(
      createStandardSuccessEnvelopeSchema(
        z.strictObject({ status: z.literal("ok") }),
      ).parse(result),
    ).toEqual(result);
  });

  it("preserves explicit response metadata", async () => {
    const cursor = encodeCursor({
      v: 1,
      sort: ["2026-07-23T12:00:00.000Z", "abcdefghijklmnopqrstu"],
    });
    const handler: CallHandler = {
      handle: () => of(responseWithMeta(["item"], { nextCursor: cursor })),
    };

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result).toEqual({
      data: ["item"],
      error: null,
      meta: { nextCursor: cursor },
    });
    expect(
      createPaginatedSuccessEnvelopeSchema(z.array(z.string())).parse(result),
    ).toEqual(result);
  });
});

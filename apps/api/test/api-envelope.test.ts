import {
  createPaginatedSuccessEnvelopeSchema,
  createStandardSuccessEnvelopeSchema,
  encodeCursor,
} from "@chinasupply/schemas";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { responseWithMeta } from "../src/common/http/api-envelope.js";
import { ApiEnvelopeInterceptor } from "../src/common/http/api-envelope.interceptor.js";

describe("ApiEnvelopeInterceptor", () => {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const interceptor = new ApiEnvelopeInterceptor(reflector);
  const context = {
    getClass: () => ApiEnvelopeInterceptor,
    getHandler: () => ApiEnvelopeInterceptor.prototype.intercept,
  } as unknown as ExecutionContext;

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

  it("passes raw response values through when route metadata opts out", async () => {
    const rawReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const rawInterceptor = new ApiEnvelopeInterceptor(rawReflector);
    const document = {
      info: { title: "ChinaSupply.AI API" },
      openapi: "3.1.0",
    };
    const handler: CallHandler = { handle: () => of(document) };

    await expect(
      firstValueFrom(rawInterceptor.intercept(context, handler)),
    ).resolves.toBe(document);
  });
});

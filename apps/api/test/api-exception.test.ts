import { apiErrorEnvelopeSchema } from "@chinasupply/schemas";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ZodValidationPipe, createZodDto } from "nestjs-zod";
import { z } from "zod";
import { describe, expect, it } from "vitest";

import { ApiErrorCode } from "../src/common/http/api-error-code.js";
import { mapExceptionToEnvelope } from "../src/common/http/api-exception.filter.js";

const InvalidBodyDto = createZodDto(
  z.object({ name: z.string().min(2) }).strict(),
);

describe("API exception mapping", () => {
  it.each([
    [new BadRequestException(), 400, ApiErrorCode.ValidationError],
    [new UnauthorizedException(), 401, ApiErrorCode.Unauthorized],
    [new ForbiddenException(), 403, ApiErrorCode.Forbidden],
    [new NotFoundException(), 404, ApiErrorCode.NotFound],
    [new HttpException("limited", 429), 429, ApiErrorCode.RateLimited],
    [new ServiceUnavailableException(), 503, ApiErrorCode.Internal],
  ])(
    "maps HTTP exceptions without exposing their response",
    (error, status, code) => {
      const mapped = mapExceptionToEnvelope(error);

      expect(mapped.status).toBe(status);
      expect(mapped.body).toMatchObject({
        data: null,
        error: { code, details: [] },
        meta: null,
      });
      expect(apiErrorEnvelopeSchema.parse(mapped.body)).toEqual(mapped.body);
      expect(JSON.stringify(mapped.body)).not.toContain("limited");
    },
  );

  it("maps unknown exceptions to a sanitized INTERNAL response", () => {
    const mapped = mapExceptionToEnvelope(
      new Error("database password leaked"),
    );

    expect(mapped).toEqual({
      status: 500,
      body: {
        data: null,
        error: {
          code: ApiErrorCode.Internal,
          details: [],
          message: "Internal server error",
        },
        meta: null,
      },
    });
    expect(apiErrorEnvelopeSchema.parse(mapped.body)).toEqual(mapped.body);
  });

  it("returns structured Zod issues for invalid input", () => {
    const pipe = new ZodValidationPipe();

    try {
      pipe.transform(
        { name: "x", unexpected: true },
        { metatype: InvalidBodyDto, type: "body" },
      );
      throw new Error("Expected validation to fail");
    } catch (error) {
      const mapped = mapExceptionToEnvelope(error);
      expect(mapped.status).toBe(400);
      expect(mapped.body.error?.code).toBe(ApiErrorCode.ValidationError);
      expect(mapped.body.error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "too_small", path: ["name"] }),
          expect.objectContaining({ code: "unrecognized_keys", path: [] }),
        ]),
      );
    }
  });
});

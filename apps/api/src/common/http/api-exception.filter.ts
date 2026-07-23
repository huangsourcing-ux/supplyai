import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import { ZodValidationException } from "nestjs-zod";
import { ZodError } from "zod";

import { ApiErrorCode } from "./api-error-code.js";
import type { ApiErrorDetail, ApiErrorEnvelope } from "./api-envelope.js";

interface MappedException {
  body: ApiErrorEnvelope;
  status: number;
}

const statusMappings = new Map<number, [ApiErrorCode, string]>([
  [HttpStatus.BAD_REQUEST, [ApiErrorCode.ValidationError, "Invalid request"]],
  [HttpStatus.UNAUTHORIZED, [ApiErrorCode.Unauthorized, "Unauthorized"]],
  [HttpStatus.FORBIDDEN, [ApiErrorCode.Forbidden, "Forbidden"]],
  [HttpStatus.NOT_FOUND, [ApiErrorCode.NotFound, "Resource not found"]],
  [
    HttpStatus.TOO_MANY_REQUESTS,
    [ApiErrorCode.RateLimited, "Too many requests"],
  ],
  [
    HttpStatus.SERVICE_UNAVAILABLE,
    [ApiErrorCode.Internal, "Service unavailable"],
  ],
]);

function getValidationDetails(exception: unknown): ApiErrorDetail[] {
  if (!(exception instanceof ZodValidationException)) {
    return [];
  }

  const error = exception.getZodError();
  if (!(error instanceof ZodError)) {
    return [];
  }

  return error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.map((segment) =>
      typeof segment === "symbol" ? (segment.description ?? "symbol") : segment,
    ),
  }));
}

export function mapExceptionToEnvelope(exception: unknown): MappedException {
  const rawStatus =
    exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  const status =
    rawStatus >= HttpStatus.BAD_REQUEST && rawStatus < 600
      ? rawStatus
      : HttpStatus.INTERNAL_SERVER_ERROR;
  const [code, message] = statusMappings.get(status) ?? [
    ApiErrorCode.Internal,
    "Internal server error",
  ];

  return {
    status,
    body: {
      data: null,
      error: {
        code,
        details: getValidationDetails(exception),
        message,
      },
      meta: null,
    },
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const mapped = mapExceptionToEnvelope(exception);

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        "Unhandled HTTP exception",
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    httpAdapter.reply(context.getResponse(), mapped.body, mapped.status);
  }
}

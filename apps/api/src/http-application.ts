import { RequestMethod } from "@nestjs/common";
import { HttpAdapterHost, Reflector } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";

import { ApiEnvelopeInterceptor } from "./common/http/api-envelope.interceptor.js";
import { ApiExceptionFilter } from "./common/http/api-exception.filter.js";
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "./config/runtime-config.module.js";

export function configureHttpApplication(app: NestFastifyApplication): void {
  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG);

  app.enableCors({
    credentials: true,
    origin: config.WEB_ORIGIN,
  });
  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "health/live", method: RequestMethod.GET },
      { path: "health/ready", method: RequestMethod.GET },
      { path: "health/edge", method: RequestMethod.GET },
      { path: "api/openapi.json", method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));
  app.enableShutdownHooks();
}

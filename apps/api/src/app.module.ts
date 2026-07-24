import { Module } from "@nestjs/common";
import { SentryModule } from "@sentry/nestjs/setup";

import { RuntimeConfigModule } from "./config/runtime-config.module.js";
import { HealthModule } from "./health/health.module.js";
import { OpenApiModule } from "./openapi/openapi.module.js";

@Module({
  imports: [
    SentryModule.forRoot(),
    RuntimeConfigModule,
    HealthModule,
    OpenApiModule,
  ],
})
export class AppModule {}

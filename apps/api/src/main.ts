import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module.js";
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "./config/runtime-config.module.js";
import { configureHttpApplication } from "./http-application.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  configureHttpApplication(app);

  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG);
  await app.listen(config.PORT, "0.0.0.0");
}

void bootstrap();

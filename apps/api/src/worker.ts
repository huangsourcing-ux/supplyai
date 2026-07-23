import "./instrument.js";
import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as Sentry from "@sentry/nestjs";

import { WorkerModule } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  Logger.log("BullMQ worker is ready", "WorkerBootstrap");
}

void bootstrap().catch(async (error: unknown) => {
  Sentry.captureException(error);
  await Sentry.flush(2_000);
  process.exitCode = 1;
});

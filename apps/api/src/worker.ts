import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  Logger.log("BullMQ worker is ready", "WorkerBootstrap");
}

void bootstrap();

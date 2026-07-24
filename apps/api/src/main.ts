import "./instrument.js";
import "reflect-metadata";

import * as Sentry from "@sentry/nestjs";
import { parseApiHttpEnv } from "@chinasupply/config/env/api";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module.js";
import { registerEdgeProxy } from "./common/http/edge-proxy.js";
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "./config/runtime-config.module.js";
import { configureHttpApplication } from "./http-application.js";

async function bootstrap(): Promise<void> {
  const httpConfig = parseApiHttpEnv(process.env);
  const adapter = new FastifyAdapter({
    trustProxy:
      httpConfig.APP_ENV === "local"
        ? false
        : ["loopback", "linklocal", "uniquelocal"],
  });
  registerEdgeProxy(adapter.getInstance(), {
    appEnvironment: httpConfig.APP_ENV,
    edgeProxySecret: httpConfig.EDGE_PROXY_SECRET,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );
  configureHttpApplication(app);

  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG);
  await app.listen(config.PORT, "0.0.0.0");
}

void bootstrap().catch(async (error: unknown) => {
  Sentry.captureException(error);
  await Sentry.flush(2_000);
  process.exitCode = 1;
});

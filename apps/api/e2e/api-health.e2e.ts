import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http-application.js";

const postgresPort = 5432;
const redisPort = 6379;
const postgresCredentials = {
  database: "chinasupply_e2e",
  password: "chinasupply_e2e_only",
  user: "chinasupply",
};

describe.sequential("API health e2e", () => {
  let app: NestFastifyApplication;
  let postgres: StartedTestContainer;
  let redis: StartedTestContainer | undefined;

  beforeAll(async () => {
    [postgres, redis] = await Promise.all([
      new GenericContainer("postgis/postgis:17-3.5")
        .withEnvironment({
          POSTGRES_DB: postgresCredentials.database,
          POSTGRES_PASSWORD: postgresCredentials.password,
          POSTGRES_USER: postgresCredentials.user,
        })
        .withExposedPorts(postgresPort)
        .withPlatform("linux/amd64")
        .withStartupTimeout(120_000)
        .withWaitStrategy(
          Wait.forLogMessage(
            /database system is ready to accept connections/,
            2,
          ),
        )
        .start(),
      new GenericContainer("redis:7.4-alpine")
        .withExposedPorts(redisPort)
        .withStartupTimeout(60_000)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
        .start(),
    ]);

    const databaseUrl = `postgresql://${postgresCredentials.user}:${postgresCredentials.password}@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/${postgresCredentials.database}`;
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(redisPort)}`;

    Object.assign(process.env, {
      APP_ENV: "local",
      DATABASE_URL: databaseUrl,
      PORT: "3001",
      REDIS_URL: redisUrl,
      WEB_ORIGIN: "http://localhost:3000",
    });

    const pool = new Pool({ connectionString: databaseUrl });
    const postgisResult = await pool.query<{ version: string }>(
      "select PostGIS_Version() as version",
    );
    await pool.end();
    expect(postgisResult.rows[0]?.version).toMatch(/^3\.5/);

    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: ["error"] },
    );
    configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all([postgres?.stop(), redis?.stop()]);
  });

  it("returns the success envelope from liveness", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: { status: "ok" },
      error: null,
      meta: {},
    });
  });

  it("reports PostGIS and Redis readiness through the success envelope", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        checks: {
          postgres: "up",
          redis: "up",
        },
        status: "ready",
      },
      error: null,
      meta: {},
    });
  });

  it("returns the frozen NOT_FOUND envelope for unknown routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/not-a-route",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      data: null,
      error: {
        code: "NOT_FOUND",
        details: [],
        message: "Resource not found",
      },
      meta: null,
    });
  });

  it("fails readiness with a sanitized INTERNAL envelope when Redis is unavailable", async () => {
    await redis?.stop();
    redis = undefined;

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      data: null,
      error: {
        code: "INTERNAL",
        details: [],
        message: "Service unavailable",
      },
      meta: null,
    });
  });
});

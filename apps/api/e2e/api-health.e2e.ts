import "reflect-metadata";

import { configureApiClient, getHealthLive } from "@chinasupply/api-client";
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
import {
  EDGE_PROXY_HEADER,
  registerEdgeProxy,
} from "../src/common/http/edge-proxy.js";
import { configureHttpApplication } from "../src/http-application.js";

const postgresPort = 5432;
const redisPort = 6379;
const edgeSecret = "e2e-edge-secret-with-at-least-32-bytes";
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
      R2_ACCOUNT_ID: "local-minio-account",
      R2_ACCESS_KEY_ID: "local-minio-access",
      R2_CDN_BASE_URL: "https://media.example.test",
      R2_ENDPOINT: "http://127.0.0.1:9000",
      R2_MEDIA_BUCKET: "chinasupply-test-media",
      R2_PREFIX: "dev",
      R2_SECRET_ACCESS_KEY: "local-minio-secret",
      WEB_ORIGIN: "http://localhost:3000",
    });

    const pool = new Pool({ connectionString: databaseUrl });
    const postgisResult = await pool.query<{ version: string }>(
      "select PostGIS_Version() as version",
    );
    await pool.end();
    expect(postgisResult.rows[0]?.version).toMatch(/^3\.5/);

    const adapter = new FastifyAdapter();
    registerEdgeProxy(adapter.getInstance(), {
      appEnvironment: "staging",
      edgeProxySecret: edgeSecret,
    });
    app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
      logger: ["error"],
    });
    configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    await app.listen(0, "127.0.0.1");
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

  it("executes the generated health client against the real Nest listener", async () => {
    configureApiClient({ baseUrl: `${await app.getUrl()}/api/v1` });

    await expect(getHealthLive()).resolves.toEqual({
      data: { status: "ok" },
      error: null,
      meta: {},
    });
  });

  it("serves the raw OpenAPI 3.1 contract outside the business envelope", async () => {
    const response = await app.inject({
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        [EDGE_PROXY_HEADER]: edgeSecret,
      },
      method: "GET",
      url: "/api/openapi.json",
    });
    const document = response.json();
    const operations = Object.values(
      document.paths as Record<string, Record<string, unknown>>,
    ).flatMap((pathItem) => Object.values(pathItem));

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(document.openapi).toBe("3.1.0");
    expect(document.data).toBeUndefined();
    expect(operations).toHaveLength(31);
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
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        [EDGE_PROXY_HEADER]: edgeSecret,
      },
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

  it("reports the trusted Cloudflare client IP without caching", async () => {
    const response = await app.inject({
      headers: {
        "cf-connecting-ip": "2001:db8::10",
        [EDGE_PROXY_HEADER]: edgeSecret,
      },
      method: "GET",
      url: "/health/edge",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual({
      data: { clientIp: "2001:db8::10" },
      error: null,
      meta: {},
    });
  });

  it("rejects direct Railway access to protected routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/edge",
    });

    expect(response.statusCode).toBe(403);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual({
      data: null,
      error: {
        code: "FORBIDDEN",
        details: [],
        message: "Cloudflare edge proxy required",
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

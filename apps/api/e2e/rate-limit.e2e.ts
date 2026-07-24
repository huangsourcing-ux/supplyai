import "reflect-metadata";

import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ClientIpThrottlerGuard } from "../src/rate-limit/client-ip-throttler.guard.js";
import { RateLimitModule } from "../src/rate-limit/rate-limit.module.js";
import { RedisThrottlerStorage } from "../src/rate-limit/redis-throttler-storage.js";
import { registerEdgeProxy } from "../src/common/http/edge-proxy.js";
import { configureHttpApplication } from "../src/http-application.js";

const redisPort = 6379;

@Controller("rate-limit-probe")
@UseGuards(ClientIpThrottlerGuard)
class RateLimitProbeController {
  @Get("one")
  one() {
    return { route: "one" };
  }

  @Get("two")
  two() {
    return { route: "two" };
  }
}

@Module({
  controllers: [RateLimitProbeController],
  imports: [RateLimitModule],
})
class RateLimitProbeModule {}

function createApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter();
  registerEdgeProxy(adapter.getInstance(), { appEnvironment: "local" });
  return NestFactory.create<NestFastifyApplication>(
    RateLimitProbeModule,
    adapter,
    { logger: false },
  );
}

describe.sequential("Redis-backed public rate limiting", () => {
  let firstApp: NestFastifyApplication;
  let secondApp: NestFastifyApplication;
  let redis: StartedTestContainer | undefined;

  beforeAll(async () => {
    const startedRedis = await new GenericContainer("redis:7.4-alpine")
      .withExposedPorts(redisPort)
      .withStartupTimeout(60_000)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();
    redis = startedRedis;

    Object.assign(process.env, {
      APP_ENV: "local",
      DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
      PORT: "3001",
      R2_CDN_BASE_URL: "http://127.0.0.1:9000",
      REDIS_URL: `redis://${startedRedis.getHost()}:${startedRedis.getMappedPort(redisPort)}`,
      WEB_ORIGIN: "http://127.0.0.1:3000",
    });

    [firstApp, secondApp] = await Promise.all([createApp(), createApp()]);
    configureHttpApplication(firstApp);
    configureHttpApplication(secondApp);
    await Promise.all([firstApp.init(), secondApp.init()]);
  });

  afterAll(async () => {
    await Promise.all([firstApp.close(), secondApp.close()]);
    if (redis !== undefined) {
      await redis.stop();
    }
  });

  it("shares one per-route IP budget across application instances", async () => {
    const remoteAddress = "203.0.113.10";
    for (let requestIndex = 0; requestIndex < 60; requestIndex += 1) {
      const app = requestIndex % 2 === 0 ? firstApp : secondApp;
      const response = await app.inject({
        method: "GET",
        remoteAddress,
        url: "/api/v1/rate-limit-probe/one",
      });
      expect(response.statusCode).toBe(200);
      if (requestIndex === 0) {
        expect(response.headers["x-ratelimit-limit"]).toBe("60");
        expect(response.headers["x-ratelimit-remaining"]).toBe("59");
        expect(
          Number(response.headers["x-ratelimit-reset"]),
        ).toBeGreaterThanOrEqual(1);
      }
    }

    const limited = await firstApp.inject({
      method: "GET",
      remoteAddress,
      url: "/api/v1/rate-limit-probe/one",
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["cache-control"]).toBe("no-store");
    expect(limited.headers["retry-after"]).toBe("60");
    expect(limited.headers["x-ratelimit-limit"]).toBe("60");
    expect(limited.headers["x-ratelimit-remaining"]).toBe("0");
    expect(limited.json()).toEqual({
      data: null,
      error: {
        code: "RATE_LIMITED",
        details: [],
        message: "Too many requests",
      },
      meta: null,
    });

    const independentRoute = await firstApp.inject({
      method: "GET",
      remoteAddress,
      url: "/api/v1/rate-limit-probe/two",
    });
    expect(independentRoute.statusCode).toBe(200);

    const spoofedForwardedFor = await firstApp.inject({
      headers: { "x-forwarded-for": "203.0.113.11" },
      method: "GET",
      remoteAddress,
      url: "/api/v1/rate-limit-probe/one",
    });
    expect(spoofedForwardedFor.statusCode).toBe(429);

    const independentIp = await firstApp.inject({
      headers: { "x-forwarded-for": remoteAddress },
      method: "GET",
      remoteAddress: "203.0.113.11",
      url: "/api/v1/rate-limit-probe/one",
    });
    expect(independentIp.statusCode).toBe(200);
  });

  it("expires rolling-window entries and their block", async () => {
    const storage = firstApp.get(RedisThrottlerStorage);
    const key = "short-window-test-key";

    expect(await storage.increment(key, 50, 1, 50, "test")).toMatchObject({
      isBlocked: false,
      totalHits: 1,
    });
    expect(await storage.increment(key, 50, 1, 50, "test")).toMatchObject({
      isBlocked: true,
      totalHits: 2,
    });

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(await storage.increment(key, 50, 1, 50, "test")).toMatchObject({
      isBlocked: false,
      totalHits: 1,
    });
  });

  it("fails closed when Redis is unavailable", async () => {
    await redis?.stop();
    redis = undefined;

    const response = await firstApp.inject({
      method: "GET",
      remoteAddress: "203.0.113.12",
      url: "/api/v1/rate-limit-probe/one",
    });
    expect(response.statusCode).toBe(500);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toMatchObject({
      error: { code: "INTERNAL" },
    });
  });
});

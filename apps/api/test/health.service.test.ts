import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { DatabaseService } from "../src/database/database.service.js";
import { HealthService } from "../src/health/health.service.js";
import type { RedisHealthService } from "../src/redis/redis-health.service.js";

function createHealthService(options?: {
  databaseError?: Error;
  redisError?: Error;
}) {
  const databasePing = options?.databaseError
    ? vi.fn().mockRejectedValue(options.databaseError)
    : vi.fn().mockResolvedValue(undefined);
  const redisPing = options?.redisError
    ? vi.fn().mockRejectedValue(options.redisError)
    : vi.fn().mockResolvedValue(undefined);
  const service = new HealthService(
    { ping: databasePing } as unknown as DatabaseService,
    { ping: redisPing } as unknown as RedisHealthService,
  );

  return { databasePing, redisPing, service };
}

describe("HealthService", () => {
  it("keeps liveness independent of external dependencies", () => {
    const { databasePing, redisPing, service } = createHealthService();

    expect(service.live()).toEqual({ status: "ok" });
    expect(databasePing).not.toHaveBeenCalled();
    expect(redisPing).not.toHaveBeenCalled();
  });

  it("reports ready only when Postgres and Redis respond", async () => {
    const { databasePing, redisPing, service } = createHealthService();

    await expect(service.ready()).resolves.toEqual({
      checks: { postgres: "up", redis: "up" },
      status: "ready",
    });
    expect(databasePing).toHaveBeenCalledOnce();
    expect(redisPing).toHaveBeenCalledOnce();
  });

  it.each([
    [{ databaseError: new Error("postgres down") }],
    [{ redisError: new Error("redis down") }],
  ])("returns service unavailable when a dependency fails", async (options) => {
    const { service } = createHealthService(options);

    await expect(service.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

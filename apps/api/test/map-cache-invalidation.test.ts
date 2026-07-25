import type { RuntimeConfig } from "../src/config/runtime-config.module.js";
import {
  buildMapCachePrefix,
  MapCacheInvalidationService,
} from "../src/cache/map-cache-invalidation.service.js";
import { describe, expect, it, vi } from "vitest";

const baseConfig: RuntimeConfig = {
  APP_ENV: "staging",
  CLERK_SECRET_KEY: "sk_test_valid_for_unit",
  CLOUDFLARE_PURGE_TOKEN: "cache-purge-token",
  CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
  DATABASE_URL: "postgresql://user:pass@db.invalid:5432/chinasupply",
  EDGE_PROXY_SECRET: "0123456789abcdef0123456789abcdef",
  PORT: 3001,
  R2_CDN_BASE_URL: "https://cdn.staging.invalid",
  REDIS_URL: "redis://redis.invalid:6379",
  SENTRY_DSN: "https://public@o1.ingest.sentry.io/1",
  SENTRY_RELEASE: "chinasupply-api@0.0.0+test",
  WEB_ORIGIN: "https://staging.invalid",
};

describe("MapCacheInvalidationService", () => {
  it("builds the exact public MAP prefix", () => {
    expect(buildMapCachePrefix("https://api-staging.chinasupply.ai")).toBe(
      "https://api-staging.chinasupply.ai/api/v1/map/",
    );
    expect(() =>
      buildMapCachePrefix("http://api-staging.chinasupply.ai"),
    ).toThrow();
    expect(() =>
      buildMapCachePrefix("https://api-staging.chinasupply.ai/other"),
    ).toThrow();
  });

  it("purges remotely and remains a local no-op", async () => {
    const cloudflare = { purgePrefixes: vi.fn().mockResolvedValue(undefined) };
    const remote = new MapCacheInvalidationService(
      baseConfig,
      cloudflare as never,
    );

    await remote.purge("https://api-staging.chinasupply.ai");
    expect(cloudflare.purgePrefixes).toHaveBeenCalledWith([
      "https://api-staging.chinasupply.ai/api/v1/map/",
    ]);

    const local = new MapCacheInvalidationService(
      { ...baseConfig, APP_ENV: "local" },
      cloudflare as never,
    );
    cloudflare.purgePrefixes.mockClear();
    await local.purge("http://localhost:3001");
    expect(cloudflare.purgePrefixes).not.toHaveBeenCalled();
  });
});

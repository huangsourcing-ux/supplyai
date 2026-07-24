import type { RuntimeConfig } from "../src/config/runtime-config.module.js";
import {
  type CachePurgeFetch,
  CloudflareCachePurgeService,
} from "../src/cache/cloudflare-cache-purge.service.js";
import { describe, expect, it, vi } from "vitest";

const config: RuntimeConfig = {
  APP_ENV: "local",
  CLOUDFLARE_PURGE_TOKEN: "cache-purge-token",
  CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
  DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/chinasupply",
  PORT: 3001,
  R2_CDN_BASE_URL: "http://127.0.0.1:9000",
  REDIS_URL: "redis://127.0.0.1:6379",
  WEB_ORIGIN: "http://127.0.0.1:3000",
};

const unsafePrefixLists: readonly [readonly string[]][] = [
  [[]],
  [["http://api-staging.chinasupply.ai/api/v1/map/"]],
  [["https://user:pass@api-staging.chinasupply.ai/api/v1/map/"]],
  [["https://api-staging.chinasupply.ai/api/v1/map/#fragment"]],
];

describe("CloudflareCachePurgeService", () => {
  it("constructs a prefix purge request without running automatically", async () => {
    const request = vi.fn<CachePurgeFetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    const service = new CloudflareCachePurgeService(config, request);

    expect(request).not.toHaveBeenCalled();
    await service.purgePrefixes([
      "https://api-staging.chinasupply.ai/api/v1/map/",
    ]);

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/zones/0123456789abcdef0123456789abcdef/purge_cache",
      {
        body: JSON.stringify({
          prefixes: ["https://api-staging.chinasupply.ai/api/v1/map/"],
        }),
        headers: {
          Authorization: "Bearer cache-purge-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
  });

  it.each(unsafePrefixLists)(
    "rejects an unsafe prefix list",
    async (prefixes) => {
      const request = vi.fn<CachePurgeFetch>();
      const service = new CloudflareCachePurgeService(config, request);

      await expect(service.purgePrefixes(prefixes)).rejects.toThrow();
      expect(request).not.toHaveBeenCalled();
    },
  );

  it("sanitizes transport and provider failures", async () => {
    const providerFailure = vi
      .fn<CachePurgeFetch>()
      .mockResolvedValue(
        new Response("provider-secret-detail", { status: 403 }),
      );
    const service = new CloudflareCachePurgeService(config, providerFailure);

    await expect(
      service.purgePrefixes(["https://api-staging.chinasupply.ai/api/v1/map/"]),
    ).rejects.toThrow("Cloudflare cache purge request failed");

    const transportFailure = vi
      .fn<CachePurgeFetch>()
      .mockRejectedValue(new Error("token cache-purge-token was rejected"));
    const transportService = new CloudflareCachePurgeService(
      config,
      transportFailure,
    );
    await expect(
      transportService.purgePrefixes([
        "https://api-staging.chinasupply.ai/api/v1/map/",
      ]),
    ).rejects.toThrow("Cloudflare cache purge request failed");
  });
});

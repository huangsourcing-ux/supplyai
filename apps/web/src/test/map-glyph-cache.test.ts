import { describe, expect, it, vi } from "vitest";

import {
  chinaSupplyMapStyleTemplate,
  createChinaSupplyMapStyle,
} from "@chinasupply/config/map/style";
import type { ResourceType, StyleSpecification } from "maplibre-gl";

import {
  collectMapGlyphFontStacks,
  createMapGlyphRuntime,
  MAP_GLYPH_CACHE_ENTRY_LIMIT,
  MAP_GLYPH_CACHE_TTL_MS,
} from "../app/(frontend)/map/map-glyph-cache";

const MAPTILER_KEY = "fixture_maptiler_key";
const GLYPHS_RESOURCE_TYPE = "Glyphs" as ResourceType;
const TILE_RESOURCE_TYPE = "Tile" as ResourceType;

class MemoryCache {
  readonly entries = new Map<string, Response>();

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(this.key(request));
  }

  async keys(): Promise<readonly Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url));
  }

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.entries.get(this.key(request))?.clone();
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(this.key(request), response.clone());
  }

  private key(request: RequestInfo | URL): string {
    if (typeof request === "string") return request;
    if (request instanceof URL) return request.href;
    return request.url;
  }
}

class MemoryCacheStorage {
  readonly stores = new Map<string, MemoryCache>();

  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name);
  }

  async keys(): Promise<string[]> {
    return [...this.stores.keys()];
  }

  async open(name: string): Promise<Cache> {
    let cache = this.stores.get(name);
    if (cache === undefined) {
      cache = new MemoryCache();
      this.stores.set(name, cache);
    }
    return cache as unknown as Cache;
  }
}

function createStyle(): StyleSpecification {
  return createChinaSupplyMapStyle(
    MAPTILER_KEY,
  ) as unknown as StyleSpecification;
}

function createRuntime({
  cacheStorage = new MemoryCacheStorage(),
  fetchResource = vi.fn(async () => new Response(Uint8Array.of(1, 2, 3))),
  now = () => 1_000,
  style = createStyle(),
}: {
  cacheStorage?: MemoryCacheStorage;
  fetchResource?: ReturnType<typeof vi.fn<typeof fetch>>;
  now?: () => number;
  style?: StyleSpecification;
} = {}) {
  const runtime = createMapGlyphRuntime({
    dependencies: {
      cacheStorage,
      fetch: fetchResource,
      inFlight: new Map(),
      now,
    },
    mapTilerKey: MAPTILER_KEY,
    style,
  });
  return { cacheStorage, fetchResource, runtime };
}

function officialGlyphUrl(
  fontStack = "Roboto Regular,Noto Sans Regular",
  range = "0-255",
): string {
  return `https://api.maptiler.com/fonts/${fontStack.replaceAll(" ", "%20")}/${range}.pbf?key=${MAPTILER_KEY}`;
}

function protocolUrl(
  runtime: ReturnType<typeof createMapGlyphRuntime>,
): string {
  const transformed = runtime.transformRequest(
    officialGlyphUrl(),
    GLYPHS_RESOURCE_TYPE,
  );
  if (transformed instanceof Promise || transformed === undefined) {
    throw new Error("Expected a synchronous glyph request transform.");
  }
  return transformed.url;
}

async function loadProtocolUrl(
  runtime: ReturnType<typeof createMapGlyphRuntime>,
  url = protocolUrl(runtime),
) {
  return await runtime.protocolHandler({ url }, new AbortController());
}

describe("MapTiler glyph cache", () => {
  it("extracts static, case, and match font branches with zoom filtering and deduplication", () => {
    const style = {
      layers: [
        {
          id: "static-font",
          layout: { "text-font": ["Roboto Regular"] },
          maxzoom: 5,
          type: "symbol",
        },
        {
          id: "expression-font",
          layout: {
            "text-font": [
              "case",
              ["boolean", true],
              ["literal", ["Roboto Bold", "Noto Sans Bold"]],
              [
                "match",
                ["get", "class"],
                "special",
                ["literal", ["Roboto Medium"]],
                ["literal", ["Roboto Regular"]],
              ],
            ],
          },
          maxzoom: 8,
          minzoom: 4,
          type: "symbol",
        },
        {
          id: "future-font",
          layout: { "text-font": ["Noto Sans Regular"] },
          minzoom: 9,
          type: "symbol",
        },
      ],
      sources: {},
      version: 8,
    } as unknown as StyleSpecification;

    expect(collectMapGlyphFontStacks(style, 4)).toEqual([
      ["Roboto Regular"],
      ["Roboto Bold", "Noto Sans Bold"],
      ["Roboto Medium"],
    ]);
    expect(collectMapGlyphFontStacks(style, 8)).toEqual([]);
    expect(collectMapGlyphFontStacks(style, 9)).toEqual([
      ["Noto Sans Regular"],
    ]);
  });

  it("extracts the active official font stacks at each initial map zoom", () => {
    const style = createStyle();

    expect(collectMapGlyphFontStacks(style, 4)).toHaveLength(6);
    expect(collectMapGlyphFontStacks(style, 10)).toHaveLength(9);
    expect(collectMapGlyphFontStacks(style, 14)).toHaveLength(8);
    expect(collectMapGlyphFontStacks(style, 4)).toContainEqual([
      "Roboto Bold",
      "Noto Sans Bold",
    ]);
    expect(collectMapGlyphFontStacks(style, 10)).toContainEqual([
      "Roboto Regular",
    ]);
  });

  it("transforms only MapTiler glyph requests to a keyless internal URL", () => {
    const { runtime } = createRuntime();
    const transformed = runtime.transformRequest(
      officialGlyphUrl(),
      GLYPHS_RESOURCE_TYPE,
    );

    expect(transformed).toEqual({
      url: "chinasupply-glyph://maptiler/fonts/Roboto%20Regular,Noto%20Sans%20Regular/0-255.pbf",
    });
    expect(JSON.stringify(transformed)).not.toContain(MAPTILER_KEY);
    expect(
      runtime.transformRequest(officialGlyphUrl(), TILE_RESOURCE_TYPE),
    ).toEqual({ url: officialGlyphUrl() });
    expect(
      runtime.transformRequest(
        "https://example.com/fonts/Roboto%20Regular/0-255.pbf",
        GLYPHS_RESOURCE_TYPE,
      ),
    ).toEqual({
      url: "https://example.com/fonts/Roboto%20Regular/0-255.pbf",
    });
  });

  it("serves a warm glyph from Cache Storage without a second fetch", async () => {
    const { cacheStorage, fetchResource, runtime } = createRuntime();

    const cold = await loadProtocolUrl(runtime);
    const warm = await loadProtocolUrl(runtime);

    expect(new Uint8Array(cold.data as ArrayBuffer)).toEqual(
      Uint8Array.of(1, 2, 3),
    );
    expect(new Uint8Array(warm.data as ArrayBuffer)).toEqual(
      Uint8Array.of(1, 2, 3),
    );
    expect(fetchResource).toHaveBeenCalledTimes(1);
    expect(fetchResource).toHaveBeenCalledWith(officialGlyphUrl(), {
      cache: "force-cache",
    });

    const cache = cacheStorage.stores.get(runtime.cacheName);
    expect(cache).toBeDefined();
    expect([...cache!.entries.keys()]).toEqual([
      "https://glyph-cache.chinasupply.invalid/fonts/Roboto%20Regular,Noto%20Sans%20Regular/0-255.pbf",
    ]);
    expect(JSON.stringify([...cache!.entries.keys()])).not.toContain(
      MAPTILER_KEY,
    );
  });

  it("deduplicates concurrent requests for the same glyph range", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchResource = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { runtime } = createRuntime({ fetchResource });

    const first = loadProtocolUrl(runtime);
    const second = loadProtocolUrl(runtime);
    await vi.waitFor(() => expect(fetchResource).toHaveBeenCalledTimes(1));
    resolveFetch?.(new Response(Uint8Array.of(4, 5, 6)));

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(new Uint8Array(firstResult.data as ArrayBuffer)).toEqual(
      Uint8Array.of(4, 5, 6),
    );
    expect(new Uint8Array(secondResult.data as ArrayBuffer)).toEqual(
      Uint8Array.of(4, 5, 6),
    );
  });

  it("expires stored glyphs after thirty days and retries failed requests", async () => {
    let currentTime = 10_000;
    const fetchResource = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(Uint8Array.of(1)))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(Uint8Array.of(2)));
    const { runtime } = createRuntime({
      fetchResource,
      now: () => currentTime,
    });

    await loadProtocolUrl(runtime);
    currentTime += MAP_GLYPH_CACHE_TTL_MS + 1;
    await expect(loadProtocolUrl(runtime)).rejects.toThrow("HTTP 503");
    await expect(loadProtocolUrl(runtime)).resolves.toMatchObject({
      data: expect.any(ArrayBuffer),
    });

    expect(fetchResource).toHaveBeenCalledTimes(3);
    const failure = await fetchResource.mock.results[1]!.value;
    expect(failure.status).toBe(503);
  });

  it("sanitizes provider transport errors and permits a later retry", async () => {
    const fetchResource = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(
        new Error(`failed ${officialGlyphUrl()} with a secret`),
      )
      .mockResolvedValueOnce(new Response(Uint8Array.of(7)));
    const { runtime } = createRuntime({ fetchResource });

    const firstError = await loadProtocolUrl(runtime).catch(
      (error: unknown) => error,
    );
    expect(firstError).toEqual(new Error("MapTiler glyph request failed."));
    expect(String(firstError)).not.toContain(MAPTILER_KEY);
    await expect(loadProtocolUrl(runtime)).resolves.toMatchObject({
      data: expect.any(ArrayBuffer),
    });
    expect(fetchResource).toHaveBeenCalledTimes(2);
  });

  it("bounds the persistent cache and removes older style cache versions", async () => {
    const cacheStorage = new MemoryCacheStorage();
    await cacheStorage.open("chinasupply-map-glyphs-obsolete");
    await cacheStorage.open("unrelated-cache");
    const style = structuredClone(
      chinaSupplyMapStyleTemplate,
    ) as unknown as StyleSpecification;
    (style.metadata as Record<string, unknown>)["chinasupply:upstreamSha256"] =
      "b".repeat(64);
    const { runtime } = createRuntime({ cacheStorage, style });

    for (let index = 0; index <= MAP_GLYPH_CACHE_ENTRY_LIMIT; index += 1) {
      const url = `chinasupply-glyph://maptiler/fonts/Roboto%20Regular/${index * 256}-${index * 256 + 255}.pbf`;
      await loadProtocolUrl(runtime, url);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cacheStorage.stores.has("chinasupply-map-glyphs-obsolete")).toBe(
      false,
    );
    expect(cacheStorage.stores.has("unrelated-cache")).toBe(true);
    expect(cacheStorage.stores.get(runtime.cacheName)?.entries.size).toBe(
      MAP_GLYPH_CACHE_ENTRY_LIMIT,
    );
  });

  it("prewarms only the active Basic Latin ranges and tolerates no cache", async () => {
    const requestedUrls: string[] = [];
    const fetchResource = vi.fn<typeof fetch>(async (input) => {
      requestedUrls.push(String(input));
      return new Response(Uint8Array.of(1));
    });
    const runtime = createMapGlyphRuntime({
      dependencies: {
        fetch: fetchResource,
        inFlight: new Map(),
        now: () => 1,
      },
      mapTilerKey: MAPTILER_KEY,
      style: createStyle(),
    });

    await expect(runtime.prewarm(4)).resolves.toBeUndefined();

    expect(fetchResource).toHaveBeenCalledTimes(6);
    expect(requestedUrls.every((url) => url.includes("/0-255.pbf"))).toBe(true);
    expect(new Set(requestedUrls).size).toBe(6);
  });

  it("keeps invalid and aborted protocol requests key-safe", async () => {
    const { runtime } = createRuntime();

    await expect(
      loadProtocolUrl(runtime, "chinasupply-glyph://evil/fonts/a/0-255.pbf"),
    ).rejects.toThrow("Invalid ChinaSupply glyph resource URL");

    const abortController = new AbortController();
    abortController.abort();
    await expect(
      runtime.protocolHandler({ url: protocolUrl(runtime) }, abortController),
    ).rejects.toThrow("aborted");
  });
});

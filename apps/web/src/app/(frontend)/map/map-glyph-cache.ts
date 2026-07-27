import type {
  AddProtocolAction,
  RequestTransformFunction,
  StyleSpecification,
} from "maplibre-gl";

const MAPTILER_ORIGIN = "https://api.maptiler.com";
const MAPTILER_GLYPH_PATH = /^\/fonts\/[^/]+\/\d+-\d+\.pbf$/u;
const GLYPH_PROTOCOL = "chinasupply-glyph";
const GLYPH_PROTOCOL_HOST = "maptiler";
const CACHE_PREFIX = "chinasupply-map-glyphs";
const CACHE_KEY_ORIGIN = "https://glyph-cache.chinasupply.invalid";
const CACHE_TIMESTAMP_HEADER = "x-chinasupply-cached-at";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const CACHE_ENTRY_LIMIT = 96;
const PREWARM_RANGE = "0-255";

type CacheStorageSubset = Pick<CacheStorage, "delete" | "keys" | "open">;

export interface MapGlyphRuntimeDependencies {
  cacheStorage?: CacheStorageSubset;
  fetch?: typeof fetch;
  inFlight?: Map<string, Promise<ArrayBuffer>>;
  now?: () => number;
}

export interface MapGlyphRuntime {
  cacheName: string;
  prewarm: (initialZoom: number) => Promise<void>;
  protocolHandler: AddProtocolAction;
  transformRequest: RequestTransformFunction;
}

const sharedInFlight = new Map<string, Promise<ArrayBuffer>>();

function getDefaultCacheStorage(): CacheStorageSubset | undefined {
  return typeof globalThis.caches === "undefined"
    ? undefined
    : globalThis.caches;
}

function normalizeMapTilerGlyphUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.origin !== MAPTILER_ORIGIN ||
      !MAPTILER_GLYPH_PATH.test(parsed.pathname)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function createProtocolUrl(pathname: string): string {
  return `${GLYPH_PROTOCOL}://${GLYPH_PROTOCOL_HOST}${pathname}`;
}

function readProtocolPathname(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== `${GLYPH_PROTOCOL}:` ||
      parsed.hostname !== GLYPH_PROTOCOL_HOST ||
      parsed.search !== "" ||
      !MAPTILER_GLYPH_PATH.test(parsed.pathname)
    ) {
      return null;
    }

    return parsed.pathname;
  } catch {
    return null;
  }
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string")
  );
}

function isMapFontStack(value: unknown): value is string[] {
  return (
    isStringArray(value) &&
    value.every((font) => /^(?:Noto Sans|Roboto)(?: |$)/u.test(font))
  );
}

function collectExpressionFontStacks(
  expression: unknown,
  stacks: string[][],
): void {
  if (!Array.isArray(expression)) return;

  if (expression[0] === "literal" && isMapFontStack(expression[1])) {
    stacks.push(expression[1]);
    return;
  }

  for (const item of expression.slice(1)) {
    collectExpressionFontStacks(item, stacks);
  }
}

export function collectMapGlyphFontStacks(
  style: StyleSpecification,
  initialZoom: number,
): string[][] {
  const stacks = new Map<string, string[]>();

  for (const layer of style.layers) {
    if (
      layer.type !== "symbol" ||
      (layer.minzoom ?? 0) > initialZoom ||
      (layer.maxzoom ?? 24) <= initialZoom
    ) {
      continue;
    }

    const textFont = layer.layout?.["text-font"];
    const layerStacks: string[][] = [];
    if (isMapFontStack(textFont)) {
      layerStacks.push(textFont);
    } else {
      collectExpressionFontStacks(textFont, layerStacks);
    }

    for (const stack of layerStacks) {
      const key = stack.join(",");
      if (!stacks.has(key)) stacks.set(key, stack);
    }
  }

  return [...stacks.values()];
}

function readUpstreamSha(style: StyleSpecification): string {
  const metadata = style.metadata as Record<string, unknown> | undefined;
  const sha = metadata?.["chinasupply:upstreamSha256"];
  return typeof sha === "string" && /^[a-f0-9]{64}$/u.test(sha)
    ? sha
    : "unversioned";
}

function createCacheName(style: StyleSpecification): string {
  return `${CACHE_PREFIX}-${readUpstreamSha(style).slice(0, 12)}`;
}

function createCacheRequest(pathname: string): Request {
  return new Request(`${CACHE_KEY_ORIGIN}${pathname}`);
}

function isFreshCachedResponse(response: Response, now: number): boolean {
  const cachedAt = Number(response.headers.get(CACHE_TIMESTAMP_HEADER));
  return Number.isFinite(cachedAt) && now - cachedAt <= CACHE_TTL_MS;
}

function createCachedResponse(data: ArrayBuffer, cachedAt: number): Response {
  return new Response(data.slice(0), {
    headers: {
      "content-type": "application/x-protobuf",
      [CACHE_TIMESTAMP_HEADER]: String(cachedAt),
    },
    status: 200,
  });
}

function createMapTilerRequestUrl(
  pathname: string,
  mapTilerKey: string,
): string {
  const url = new URL(pathname, MAPTILER_ORIGIN);
  url.searchParams.set("key", mapTilerKey);
  return url.href;
}

export function createMapGlyphRuntime({
  dependencies = {},
  mapTilerKey,
  style,
}: {
  dependencies?: MapGlyphRuntimeDependencies;
  mapTilerKey: string;
  style: StyleSpecification;
}): MapGlyphRuntime {
  const cacheName = createCacheName(style);
  const cacheStorage = dependencies.cacheStorage ?? getDefaultCacheStorage();
  const fetchResource = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  const inFlight = dependencies.inFlight ?? sharedInFlight;
  const now = dependencies.now ?? Date.now;
  let cachePromise: Promise<Cache | undefined> | undefined;
  let cacheCleanupStarted = false;
  let evictionQueue = Promise.resolve();

  const cleanOldCaches = async () => {
    if (cacheStorage === undefined || cacheCleanupStarted) return;
    cacheCleanupStarted = true;

    try {
      const names = await cacheStorage.keys();
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith(`${CACHE_PREFIX}-`) && name !== cacheName,
          )
          .map((name) => cacheStorage.delete(name)),
      );
    } catch {
      // Cache maintenance must never block the map.
    }
  };

  const openCache = (): Promise<Cache | undefined> => {
    cachePromise ??= (async () => {
      if (cacheStorage === undefined) return undefined;
      void cleanOldCaches();

      try {
        return await cacheStorage.open(cacheName);
      } catch {
        return undefined;
      }
    })();
    return cachePromise;
  };

  const enforceEntryLimit = async (cache: Cache) => {
    try {
      const keys = await cache.keys();
      const excess = keys.length - CACHE_ENTRY_LIMIT;
      if (excess <= 0) return;
      await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
    } catch {
      // A successfully loaded glyph remains usable even if cleanup fails.
    }
  };

  const readCachedGlyph = async (
    cache: Cache | undefined,
    request: Request,
  ): Promise<ArrayBuffer | undefined> => {
    if (cache === undefined) return undefined;

    try {
      const response = await cache.match(request);
      if (response === undefined) return undefined;
      if (isFreshCachedResponse(response, now())) {
        return await response.arrayBuffer();
      }
      await cache.delete(request);
    } catch {
      // Fall through to the provider request.
    }

    return undefined;
  };

  const loadGlyph = (pathname: string): Promise<ArrayBuffer> => {
    const existing = inFlight.get(pathname);
    if (existing !== undefined) return existing;

    const request = (async () => {
      const cacheRequest = createCacheRequest(pathname);
      const cache = await openCache();
      const cached = await readCachedGlyph(cache, cacheRequest);
      if (cached !== undefined) return cached;

      let response: Response;
      try {
        response = await fetchResource(
          createMapTilerRequestUrl(pathname, mapTilerKey),
          { cache: "force-cache" },
        );
      } catch {
        throw new Error("MapTiler glyph request failed.");
      }
      if (!response.ok) {
        throw new Error(
          `MapTiler glyph request failed with HTTP ${response.status}.`,
        );
      }

      let data: ArrayBuffer;
      try {
        data = await response.arrayBuffer();
      } catch {
        throw new Error("MapTiler glyph response could not be read.");
      }
      if (cache !== undefined) {
        try {
          await cache.put(cacheRequest, createCachedResponse(data, now()));
          evictionQueue = evictionQueue.then(
            () => enforceEntryLimit(cache),
            () => enforceEntryLimit(cache),
          );
          void evictionQueue;
        } catch {
          // Browser HTTP caching remains available when Cache Storage fails.
        }
      }

      return data;
    })();

    inFlight.set(pathname, request);
    const clearInFlight = () => {
      if (inFlight.get(pathname) === request) inFlight.delete(pathname);
    };
    void request.then(clearInFlight, clearInFlight);
    return request;
  };

  const protocolHandler: AddProtocolAction = async (
    requestParameters,
    abortController,
  ) => {
    const pathname = readProtocolPathname(requestParameters.url);
    if (pathname === null) {
      throw new Error("Invalid ChinaSupply glyph resource URL.");
    }
    if (abortController.signal.aborted) {
      throw new Error("ChinaSupply glyph request was aborted.");
    }

    const data = await loadGlyph(pathname);
    if (abortController.signal.aborted) {
      throw new Error("ChinaSupply glyph request was aborted.");
    }
    return { data };
  };

  const transformRequest: RequestTransformFunction = (url, resourceType) => {
    if (resourceType !== "Glyphs") return { url };
    const glyphUrl = normalizeMapTilerGlyphUrl(url);
    return glyphUrl === null
      ? { url }
      : { url: createProtocolUrl(glyphUrl.pathname) };
  };

  const prewarm = async (initialZoom: number) => {
    const glyphTemplate = style.glyphs;
    if (typeof glyphTemplate !== "string") return;

    const requests = collectMapGlyphFontStacks(style, initialZoom).flatMap(
      (stack) => {
        const url = glyphTemplate
          .replace("{fontstack}", stack.join(","))
          .replace("{range}", PREWARM_RANGE);
        const glyphUrl = normalizeMapTilerGlyphUrl(url);
        return glyphUrl === null ? [] : [loadGlyph(glyphUrl.pathname)];
      },
    );

    await Promise.allSettled(requests);
  };

  return {
    cacheName,
    prewarm,
    protocolHandler,
    transformRequest,
  };
}

export const MAP_GLYPH_PROTOCOL = GLYPH_PROTOCOL;
export const MAP_GLYPH_CACHE_ENTRY_LIMIT = CACHE_ENTRY_LIMIT;
export const MAP_GLYPH_CACHE_TTL_MS = CACHE_TTL_MS;

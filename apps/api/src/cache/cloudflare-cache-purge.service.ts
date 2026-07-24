import { Inject, Injectable } from "@nestjs/common";

import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";

export const CACHE_PURGE_FETCH = Symbol("CACHE_PURGE_FETCH");

export type CachePurgeFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

@Injectable()
export class CloudflareCachePurgeService {
  constructor(
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
    @Inject(CACHE_PURGE_FETCH) private readonly request: CachePurgeFetch,
  ) {}

  async purgePrefixes(prefixes: readonly string[]): Promise<void> {
    const zoneId = this.config.CLOUDFLARE_ZONE_ID;
    const token = this.config.CLOUDFLARE_PURGE_TOKEN;
    if (zoneId === undefined || token === undefined) {
      throw new Error("Cloudflare cache purge configuration is unavailable");
    }

    if (prefixes.length === 0) {
      throw new Error("At least one cache prefix is required");
    }

    const normalizedPrefixes = prefixes.map(validatePrefix);
    let response: Response;
    try {
      response = await this.request(
        `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/purge_cache`,
        {
          body: JSON.stringify({ prefixes: normalizedPrefixes }),
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
    } catch {
      throw new Error("Cloudflare cache purge request failed");
    }

    if (!response.ok) {
      throw new Error("Cloudflare cache purge request failed");
    }

    try {
      const body: unknown = await response.json();
      if (
        typeof body !== "object" ||
        body === null ||
        !("success" in body) ||
        body.success !== true
      ) {
        throw new Error("Cloudflare cache purge request failed");
      }
    } catch {
      throw new Error("Cloudflare cache purge request failed");
    }
  }
}

function validatePrefix(prefix: string): string {
  const url = new URL(prefix);
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new Error("Cache purge prefixes must be public HTTPS URLs");
  }

  return url.toString();
}

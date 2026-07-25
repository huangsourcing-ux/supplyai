import { Inject, Injectable } from "@nestjs/common";

import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";
import { CloudflareCachePurgeService } from "./cloudflare-cache-purge.service.js";

export const MAP_CACHE_PATH_PREFIX = "/api/v1/map/";

export function buildMapCachePrefix(requestOrigin: string): string {
  const origin = new URL(requestOrigin);
  if (
    origin.protocol !== "https:" ||
    origin.username !== "" ||
    origin.password !== "" ||
    origin.pathname !== "/" ||
    origin.search !== "" ||
    origin.hash !== ""
  ) {
    throw new Error("Remote API origin must be a public HTTPS origin");
  }

  return new URL(MAP_CACHE_PATH_PREFIX, origin).toString();
}

@Injectable()
export class MapCacheInvalidationService {
  constructor(
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
    @Inject(CloudflareCachePurgeService)
    private readonly cloudflare: CloudflareCachePurgeService,
  ) {}

  async purge(requestOrigin: string): Promise<void> {
    if (this.config.APP_ENV === "local") {
      return;
    }

    await this.cloudflare.purgePrefixes([buildMapCachePrefix(requestOrigin)]);
  }
}

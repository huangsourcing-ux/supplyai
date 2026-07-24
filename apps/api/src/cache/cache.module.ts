import { Module } from "@nestjs/common";

import { RuntimeConfigModule } from "../config/runtime-config.module.js";
import {
  CACHE_PURGE_FETCH,
  CloudflareCachePurgeService,
} from "./cloudflare-cache-purge.service.js";

@Module({
  exports: [CloudflareCachePurgeService],
  imports: [RuntimeConfigModule],
  providers: [
    {
      provide: CACHE_PURGE_FETCH,
      useValue: globalThis.fetch.bind(globalThis),
    },
    CloudflareCachePurgeService,
  ],
})
export class CacheModule {}

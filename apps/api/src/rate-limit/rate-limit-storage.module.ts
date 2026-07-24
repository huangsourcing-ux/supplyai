import { Module } from "@nestjs/common";

import { RuntimeConfigModule } from "../config/runtime-config.module.js";
import { RedisThrottlerStorage } from "./redis-throttler-storage.js";

@Module({
  exports: [RedisThrottlerStorage],
  imports: [RuntimeConfigModule],
  providers: [RedisThrottlerStorage],
})
export class RateLimitStorageModule {}

import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { ClientIpThrottlerGuard } from "./client-ip-throttler.guard.js";
import { PUBLIC_READ_RATE_LIMIT } from "./rate-limit.constants.js";
import { RateLimitStorageModule } from "./rate-limit-storage.module.js";
import { RedisThrottlerStorage } from "./redis-throttler-storage.js";

@Module({
  exports: [ClientIpThrottlerGuard, RateLimitStorageModule],
  imports: [
    RateLimitStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [RateLimitStorageModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        storage,
        throttlers: [PUBLIC_READ_RATE_LIMIT],
      }),
    }),
  ],
  providers: [ClientIpThrottlerGuard],
})
export class RateLimitModule {}

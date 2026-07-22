import { Module } from "@nestjs/common";

import { RedisHealthService } from "./redis-health.service.js";

@Module({
  providers: [RedisHealthService],
  exports: [RedisHealthService],
})
export class RedisModule {}

import { Module } from "@nestjs/common";

import { MapCacheControlInterceptor } from "../cache/map-cache-control.interceptor.js";
import { DatabaseModule } from "../database/database.module.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { MapController } from "./map.controller.js";
import { MapService } from "./map.service.js";

@Module({
  controllers: [MapController],
  imports: [DatabaseModule, RateLimitModule],
  providers: [MapCacheControlInterceptor, MapService],
})
export class MapModule {}

import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { CacheModule } from "../cache/cache.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { MediaModule } from "../media/media.module.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import {
  AdminClustersController,
  AdminFactoriesController,
  AdminUploadsController,
} from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({
  controllers: [
    AdminClustersController,
    AdminFactoriesController,
    AdminUploadsController,
  ],
  imports: [
    AuthModule,
    CacheModule,
    DatabaseModule,
    MediaModule,
    RateLimitModule,
  ],
  providers: [AdminService],
})
export class AdminModule {}

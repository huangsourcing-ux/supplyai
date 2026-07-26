import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { ClustersModule } from "../clusters/clusters.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { FactoriesModule } from "../factories/factories.module.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { FavoritesController } from "./favorites.controller.js";
import { FavoritesService } from "./favorites.service.js";

@Module({
  controllers: [FavoritesController],
  imports: [
    AuthModule,
    ClustersModule,
    DatabaseModule,
    FactoriesModule,
    RateLimitModule,
  ],
  providers: [FavoritesService],
})
export class FavoritesModule {}

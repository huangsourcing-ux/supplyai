import { Module } from "@nestjs/common";
import { SentryModule } from "@sentry/nestjs/setup";

import { CacheModule } from "./cache/cache.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { ClustersModule } from "./clusters/clusters.module.js";
import { RuntimeConfigModule } from "./config/runtime-config.module.js";
import { FactoriesModule } from "./factories/factories.module.js";
import { HealthModule } from "./health/health.module.js";
import { MapModule } from "./map/map.module.js";
import { OpenApiModule } from "./openapi/openapi.module.js";
import { SearchModule } from "./search/search.module.js";

@Module({
  imports: [
    SentryModule.forRoot(),
    RuntimeConfigModule,
    CacheModule,
    CategoriesModule,
    ClustersModule,
    FactoriesModule,
    SearchModule,
    MapModule,
    HealthModule,
    OpenApiModule,
  ],
})
export class AppModule {}

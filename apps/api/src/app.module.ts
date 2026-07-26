import { Module } from "@nestjs/common";
import { SentryModule } from "@sentry/nestjs/setup";

import { AccountModule } from "./account/account.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { CacheModule } from "./cache/cache.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { ClustersModule } from "./clusters/clusters.module.js";
import { RuntimeConfigModule } from "./config/runtime-config.module.js";
import { FactoriesModule } from "./factories/factories.module.js";
import { FavoritesModule } from "./favorites/favorites.module.js";
import { HealthModule } from "./health/health.module.js";
import { MapModule } from "./map/map.module.js";
import { OpenApiModule } from "./openapi/openapi.module.js";
import { SearchModule } from "./search/search.module.js";
import { WebhooksModule } from "./webhooks/webhooks.module.js";

@Module({
  imports: [
    SentryModule.forRoot(),
    RuntimeConfigModule,
    CacheModule,
    AccountModule,
    AdminModule,
    CategoriesModule,
    ClustersModule,
    FactoriesModule,
    FavoritesModule,
    SearchModule,
    WebhooksModule,
    MapModule,
    HealthModule,
    OpenApiModule,
  ],
})
export class AppModule {}

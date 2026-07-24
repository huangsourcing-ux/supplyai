import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { SearchController } from "./search.controller.js";
import { SearchService } from "./search.service.js";

@Module({
  controllers: [SearchController],
  imports: [DatabaseModule, RateLimitModule],
  providers: [SearchService],
})
export class SearchModule {}

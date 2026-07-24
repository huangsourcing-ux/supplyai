import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { MediaModule } from "../media/media.module.js";
import {
  ClusterFactoriesController,
  FactoriesController,
} from "./factories.controller.js";
import { FactoriesService } from "./factories.service.js";

@Module({
  controllers: [ClusterFactoriesController, FactoriesController],
  imports: [DatabaseModule, MediaModule],
  providers: [FactoriesService],
})
export class FactoriesModule {}

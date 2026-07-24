import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { CategoriesController } from "./categories.controller.js";
import { CategoriesService } from "./categories.service.js";

@Module({
  controllers: [CategoriesController],
  imports: [DatabaseModule],
  providers: [CategoriesService],
})
export class CategoriesModule {}

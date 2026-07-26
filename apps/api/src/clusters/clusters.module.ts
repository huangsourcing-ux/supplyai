import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { MediaModule } from "../media/media.module.js";
import { ClustersController } from "./clusters.controller.js";
import { ClustersService } from "./clusters.service.js";

@Module({
  controllers: [ClustersController],
  exports: [ClustersService],
  imports: [DatabaseModule, MediaModule],
  providers: [ClustersService],
})
export class ClustersModule {}

import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { MapController } from "./map.controller.js";
import { MapService } from "./map.service.js";

@Module({
  controllers: [MapController],
  imports: [DatabaseModule],
  providers: [MapService],
})
export class MapModule {}

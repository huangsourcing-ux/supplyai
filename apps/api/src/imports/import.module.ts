import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { AmapGeocodingModule } from "./amap-geocoding.module.js";
import { GeocodeFactoriesService } from "./geocode-factories.service.js";
import { IMPORT_QUEUE } from "./import.constants.js";
import { ImportPersistenceService } from "./import-persistence.service.js";
import { ImportProcessor } from "./import.processor.js";
import { ImportService } from "./import.service.js";
import { PrivateObjectStorageModule } from "./private-object-storage.module.js";

@Module({
  imports: [
    AmapGeocodingModule,
    DatabaseModule,
    PrivateObjectStorageModule,
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
  ],
  providers: [
    GeocodeFactoriesService,
    ImportPersistenceService,
    ImportProcessor,
    ImportService,
  ],
})
export class ImportModule {}

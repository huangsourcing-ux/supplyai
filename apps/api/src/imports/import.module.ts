import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IMPORT_QUEUE } from "./import.constants.js";
import { ImportPersistenceService } from "./import-persistence.service.js";
import { ImportProcessor } from "./import.processor.js";
import { ImportService } from "./import.service.js";
import { PrivateObjectStorageModule } from "./private-object-storage.module.js";

@Module({
  imports: [
    DatabaseModule,
    PrivateObjectStorageModule,
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
  ],
  providers: [ImportPersistenceService, ImportProcessor, ImportService],
})
export class ImportModule {}

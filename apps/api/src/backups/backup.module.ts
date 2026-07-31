import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { PrivateObjectStorageModule } from "../imports/private-object-storage.module.js";
import { BackupConfigModule } from "./backup-config.module.js";
import { BackupProcessor } from "./backup.processor.js";
import { BackupSchedulerService } from "./backup-scheduler.service.js";
import { BackupService } from "./backup.service.js";
import { MAINTENANCE_QUEUE } from "./backup.constants.js";

@Module({
  imports: [
    BackupConfigModule,
    DatabaseModule,
    PrivateObjectStorageModule,
    BullModule.registerQueue({ name: MAINTENANCE_QUEUE }),
  ],
  providers: [BackupProcessor, BackupSchedulerService, BackupService],
})
export class BackupModule {}

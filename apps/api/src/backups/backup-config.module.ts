import { Global, Module } from "@nestjs/common";
import { parseBackupWorkerEnv } from "@chinasupply/config/env/api";

export const BACKUP_CONFIG = Symbol("BACKUP_CONFIG");

export type BackupConfig = ReturnType<typeof parseBackupWorkerEnv>;

@Global()
@Module({
  providers: [
    {
      provide: BACKUP_CONFIG,
      useFactory: (): BackupConfig =>
        Object.freeze(parseBackupWorkerEnv(process.env)),
    },
  ],
  exports: [BACKUP_CONFIG],
})
export class BackupConfigModule {}

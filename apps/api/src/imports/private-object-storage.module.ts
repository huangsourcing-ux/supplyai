import { Module } from "@nestjs/common";
import { parsePrivateObjectStorageEnv } from "@chinasupply/config/env/api";

import {
  PRIVATE_OBJECT_STORAGE_CONFIG,
  PrivateObjectStorageService,
} from "./private-object-storage.service.js";

@Module({
  providers: [
    {
      provide: PRIVATE_OBJECT_STORAGE_CONFIG,
      useFactory: () =>
        Object.freeze(parsePrivateObjectStorageEnv(process.env)),
    },
    PrivateObjectStorageService,
  ],
  exports: [PrivateObjectStorageService],
})
export class PrivateObjectStorageModule {}

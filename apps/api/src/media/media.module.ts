import { Module } from "@nestjs/common";
import { parsePublicMediaStorageEnv } from "@chinasupply/config/env/api";

import {
  MediaObjectStorageService,
  PUBLIC_MEDIA_STORAGE_CONFIG,
} from "./media-object-storage.service.js";
import { PublicMediaUrlService } from "./public-media-url.service.js";

@Module({
  exports: [MediaObjectStorageService, PublicMediaUrlService],
  providers: [
    {
      provide: PUBLIC_MEDIA_STORAGE_CONFIG,
      useFactory: () => Object.freeze(parsePublicMediaStorageEnv(process.env)),
    },
    MediaObjectStorageService,
    PublicMediaUrlService,
  ],
})
export class MediaModule {}

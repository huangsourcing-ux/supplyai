import { Module } from "@nestjs/common";

import { PublicMediaUrlService } from "./public-media-url.service.js";

@Module({
  exports: [PublicMediaUrlService],
  providers: [PublicMediaUrlService],
})
export class MediaModule {}

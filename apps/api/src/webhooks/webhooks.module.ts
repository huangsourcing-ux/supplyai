import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { WebhooksController } from "./webhooks.controller.js";
import { ClerkWebhookService } from "./webhooks.service.js";

@Module({
  controllers: [WebhooksController],
  imports: [DatabaseModule],
  providers: [ClerkWebhookService],
})
export class WebhooksModule {}

import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  type RawBodyRequest,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { ClerkWebhookService } from "./webhooks.service.js";

@Controller("webhooks")
export class WebhooksController {
  constructor(
    @Inject(ClerkWebhookService)
    private readonly webhooks: ClerkWebhookService,
  ) {}

  @Post("clerk")
  @HttpCode(HttpStatus.OK)
  handleClerkWebhook(
    @Req() request: RawBodyRequest<FastifyRequest>,
  ): Promise<{ duplicate: boolean; processed: boolean }> {
    return this.webhooks.handle(request.rawBody, request.headers);
  }
}

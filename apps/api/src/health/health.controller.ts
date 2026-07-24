import { Controller, Get, Header, Inject, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get("live")
  live(): { status: "ok" } {
    return this.health.live();
  }

  @Get("edge")
  @Header("Cache-Control", "no-store")
  edge(@Req() request: FastifyRequest): { clientIp: string } {
    return { clientIp: request.clientIp };
  }

  @Get("ready")
  ready() {
    return this.health.ready();
  }
}

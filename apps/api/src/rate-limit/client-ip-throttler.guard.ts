import {
  type ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerLimitDetail } from "@nestjs/throttler";
import type { FastifyReply } from "fastify";

@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(
    request: Record<string, unknown>,
  ): Promise<string> {
    const clientIp = request.clientIp;
    if (typeof clientIp !== "string" || clientIp.length === 0) {
      throw new InternalServerErrorException(
        "Validated client IP is unavailable",
      );
    }

    return clientIp;
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<FastifyReply>();
    response.header("X-RateLimit-Limit", detail.limit);
    response.header("X-RateLimit-Remaining", 0);
    response.header("X-RateLimit-Reset", detail.timeToExpire);
    await super.throwThrottlingException(context, detail);
  }
}

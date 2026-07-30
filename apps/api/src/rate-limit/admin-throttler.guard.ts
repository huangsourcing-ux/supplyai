import {
  type ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerLimitDetail } from "@nestjs/throttler";
import type { FastifyReply } from "fastify";

export function getAdminThrottleTracker(
  request: Record<string, unknown>,
): string {
  const adminUserId = request.adminUserId;
  if (typeof adminUserId !== "string" || adminUserId.length === 0) {
    throw new InternalServerErrorException(
      "Authenticated administrator ID is unavailable",
    );
  }

  return adminUserId;
}

@Injectable()
export class AdminThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(
    request: Record<string, unknown>,
  ): Promise<string> {
    return Promise.resolve(getAdminThrottleTracker(request));
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

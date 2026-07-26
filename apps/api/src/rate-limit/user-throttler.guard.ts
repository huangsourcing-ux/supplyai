import {
  type ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerLimitDetail } from "@nestjs/throttler";
import type { FastifyReply } from "fastify";

export function getUserThrottleTracker(
  request: Record<string, unknown>,
): string {
  const userId = request.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new InternalServerErrorException(
      "Authenticated user ID is unavailable",
    );
  }

  return userId;
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(
    request: Record<string, unknown>,
  ): Promise<string> {
    return Promise.resolve(getUserThrottleTracker(request));
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

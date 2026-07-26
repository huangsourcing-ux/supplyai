import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";

import { DatabaseService } from "../database/database.service.js";
import { users } from "../database/schema.js";
import {
  CLERK_TOKEN_VERIFIER,
  type ClerkTokenVerifier,
  getBearerToken,
  getSubject,
} from "./admin-auth.guard.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    @Inject(CLERK_TOKEN_VERIFIER)
    private readonly verifyClerkToken: ClerkTokenVerifier,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = getBearerToken(request.headers.authorization);
    if (token === null) {
      throw new UnauthorizedException();
    }

    let claims: unknown;
    try {
      claims = await this.verifyClerkToken(token);
    } catch {
      throw new UnauthorizedException();
    }

    const subject = getSubject(claims);
    if (subject === null) {
      throw new UnauthorizedException();
    }

    const [user] = await this.database.db
      .select({ deletedAt: users.deletedAt, id: users.id })
      .from(users)
      .where(eq(users.id, subject))
      .limit(1);
    if (user === undefined || user.deletedAt !== null) {
      throw new UnauthorizedException();
    }

    request.userId = subject;
    return true;
  }
}

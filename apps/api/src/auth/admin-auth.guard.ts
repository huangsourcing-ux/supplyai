import { verifyToken } from "@clerk/backend";
import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import type { RuntimeConfig } from "../config/runtime-config.module.js";

declare module "fastify" {
  interface FastifyRequest {
    adminUserId?: string;
  }
}

export const CLERK_TOKEN_VERIFIER = Symbol("CLERK_TOKEN_VERIFIER");

export type ClerkTokenVerifier = (token: string) => Promise<unknown>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasAdminRole(claims: unknown): boolean {
  return (
    isRecord(claims) &&
    isRecord(claims.metadata) &&
    claims.metadata.role === "admin"
  );
}

export function getBearerToken(
  authorization: string | string[] | undefined,
): string | null {
  if (typeof authorization !== "string" || authorization.includes(",")) {
    return null;
  }

  const match = /^Bearer ([^\s]+)$/u.exec(authorization);
  return match?.[1] ?? null;
}

function getSubject(claims: unknown): string | null {
  if (!isRecord(claims)) {
    return null;
  }

  return typeof claims.sub === "string" && claims.sub.length > 0
    ? claims.sub
    : null;
}

export function createClerkTokenVerifier(
  config: RuntimeConfig,
): ClerkTokenVerifier {
  return async (token) => {
    if (config.CLERK_SECRET_KEY === undefined) {
      throw new Error("Clerk authentication is unavailable");
    }

    return verifyToken(token, {
      authorizedParties: [config.WEB_ORIGIN],
      secretKey: config.CLERK_SECRET_KEY,
    });
  };
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @Inject(CLERK_TOKEN_VERIFIER)
    private readonly verifyClerkToken: ClerkTokenVerifier,
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

    if (!hasAdminRole(claims)) {
      throw new ForbiddenException();
    }

    request.adminUserId = subject;
    return true;
  }
}

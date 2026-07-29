import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { UserAuthGuard } from "../src/auth/user-auth.guard.js";
import type { DatabaseService } from "../src/database/database.service.js";

function contextFor(request: {
  headers: { authorization?: string };
  userId?: string;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function databaseReturning(
  rows: { deletedAt: Date | null; id: string }[],
): DatabaseService {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  return { db: { select } } as unknown as DatabaseService;
}

describe("UserAuthGuard", () => {
  it("attaches the active synchronized Clerk subject", async () => {
    const request = { headers: { authorization: "Bearer user-token" } };
    const verify = vi.fn().mockResolvedValue({ sub: "user_active" });
    const guard = new UserAuthGuard(
      verify,
      databaseReturning([{ deletedAt: null, id: "user_active" }]),
    );

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith("user-token", "web-or-native");
    expect(request).toMatchObject({ userId: "user_active" });
  });

  it("rejects missing and invalid Clerk tokens", async () => {
    const missing = new UserAuthGuard(vi.fn(), databaseReturning([]));
    await expect(
      missing.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const invalid = new UserAuthGuard(
      vi.fn().mockRejectedValue(new Error("private Clerk detail")),
      databaseReturning([]),
    );
    await expect(
      invalid.canActivate(
        contextFor({ headers: { authorization: "Bearer invalid" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects tokens without a subject", async () => {
    const guard = new UserAuthGuard(
      vi.fn().mockResolvedValue({}),
      databaseReturning([]),
    );

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: "Bearer user-token" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects unsynchronized and soft-deleted users", async () => {
    const verify = vi.fn().mockResolvedValue({ sub: "user_missing" });
    const missing = new UserAuthGuard(verify, databaseReturning([]));
    await expect(
      missing.canActivate(
        contextFor({ headers: { authorization: "Bearer user-token" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const deleted = new UserAuthGuard(
      vi.fn().mockResolvedValue({ sub: "user_deleted" }),
      databaseReturning([
        { deletedAt: new Date("2026-07-26T12:00:00.000Z"), id: "user_deleted" },
      ]),
    );
    await expect(
      deleted.canActivate(
        contextFor({ headers: { authorization: "Bearer user-token" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

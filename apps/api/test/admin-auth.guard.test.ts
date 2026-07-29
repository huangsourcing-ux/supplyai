import { verifyToken } from "@clerk/backend";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminAuthGuard,
  createClerkTokenVerifier,
  getBearerToken,
  hasAllowedUserAuthorizedParty,
  hasAdminRole,
} from "../src/auth/admin-auth.guard.js";
import type { RuntimeConfig } from "../src/config/runtime-config.module.js";

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
}));

const clerkConfig = {
  CLERK_SECRET_KEY: "test-clerk-secret",
  WEB_ORIGIN: "https://staging.chinasupply.ai",
} as RuntimeConfig;

const verifyTokenMock = vi.mocked(verifyToken);
type VerifiedClerkToken = Awaited<ReturnType<typeof verifyToken>>;

function contextFor(request: {
  adminUserId?: string;
  headers: { authorization?: string };
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe("createClerkTokenVerifier", () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
  });

  it("passes authorizedParties for the default and explicit web-only policy", async () => {
    verifyTokenMock.mockResolvedValue({
      sub: "web-user",
    } as VerifiedClerkToken);
    const verify = createClerkTokenVerifier(clerkConfig);

    await verify("default-token");
    await verify("explicit-token", "web-only");

    const expectedOptions = {
      authorizedParties: [clerkConfig.WEB_ORIGIN],
      secretKey: clerkConfig.CLERK_SECRET_KEY,
    };
    expect(verifyTokenMock).toHaveBeenNthCalledWith(
      1,
      "default-token",
      expectedOptions,
    );
    expect(verifyTokenMock).toHaveBeenNthCalledWith(
      2,
      "explicit-token",
      expectedOptions,
    );
  });

  it("omits authorizedParties for the web-or-native policy", async () => {
    const claims = { sub: "native-user" } as VerifiedClerkToken;
    verifyTokenMock.mockResolvedValue(claims);
    const verify = createClerkTokenVerifier(clerkConfig);

    await expect(verify("native-token", "web-or-native")).resolves.toBe(claims);
    expect(verifyTokenMock).toHaveBeenCalledWith("native-token", {
      secretKey: clerkConfig.CLERK_SECRET_KEY,
    });
  });
});

describe("AdminAuthGuard", () => {
  it("accepts only one strict bearer token", () => {
    expect(getBearerToken("Bearer token-value")).toBe("token-value");
    expect(getBearerToken(undefined)).toBeNull();
    expect(getBearerToken("bearer token-value")).toBeNull();
    expect(getBearerToken("Bearer token value")).toBeNull();
    expect(getBearerToken("Bearer one,Bearer two")).toBeNull();
  });

  it("accepts only the exact metadata admin role", () => {
    expect(hasAdminRole({ metadata: { role: "admin" } })).toBe(true);
    expect(hasAdminRole({ publicMetadata: { role: "admin" } })).toBe(false);
    expect(hasAdminRole({ metadata: { role: "Admin" } })).toBe(false);
    expect(hasAdminRole({ metadata: null })).toBe(false);
  });

  it("accepts native user tokens without azp and only the configured web azp", () => {
    const webOrigin = "https://staging.chinasupply.ai";

    expect(hasAllowedUserAuthorizedParty({ sub: "native" }, webOrigin)).toBe(
      true,
    );
    expect(
      hasAllowedUserAuthorizedParty({ azp: webOrigin, sub: "web" }, webOrigin),
    ).toBe(true);
    expect(
      hasAllowedUserAuthorizedParty(
        { azp: "https://untrusted.example.com", sub: "web" },
        webOrigin,
      ),
    ).toBe(false);
    expect(hasAllowedUserAuthorizedParty({ azp: null }, webOrigin)).toBe(false);
    expect(hasAllowedUserAuthorizedParty(null, webOrigin)).toBe(false);
  });

  it("attaches the verified Clerk subject", async () => {
    const request = { headers: { authorization: "Bearer admin-token" } };
    const verify = vi.fn().mockResolvedValue({
      metadata: { role: "admin" },
      sub: "user_admin",
    });
    const guard = new AdminAuthGuard(verify);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith("admin-token");
    expect(request).toMatchObject({ adminUserId: "user_admin" });
  });

  it("maps missing or invalid authentication to 401", async () => {
    const missing = new AdminAuthGuard(vi.fn());
    await expect(
      missing.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const invalid = new AdminAuthGuard(
      vi.fn().mockRejectedValue(new Error("secret detail")),
    );
    await expect(
      invalid.canActivate(
        contextFor({ headers: { authorization: "Bearer invalid" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps an authenticated non-admin to 403", async () => {
    const guard = new AdminAuthGuard(
      vi.fn().mockResolvedValue({
        metadata: { role: "viewer" },
        sub: "user_viewer",
      }),
    );

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: "Bearer viewer-token" } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

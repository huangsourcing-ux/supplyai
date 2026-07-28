import { QueryClient } from "@tanstack/react-query";

import {
  clearMobileSession,
  isUnauthorizedProtectedRequest,
  requestWithSessionToken,
  SessionTokenUnavailableError,
} from "./mobile-protected-api";

describe("mobile protected request and session cleanup", () => {
  it("injects a Clerk Bearer token and preserves an AbortSignal", async () => {
    const getToken = jest.fn(async () => "session-token");
    const controller = new AbortController();

    await expect(
      requestWithSessionToken(getToken, controller.signal),
    ).resolves.toEqual({
      headers: { Authorization: "Bearer session-token" },
      signal: controller.signal,
    });
  });

  it("classifies a missing token and API 401 as an expired session", async () => {
    await expect(
      requestWithSessionToken(async () => null),
    ).rejects.toBeInstanceOf(SessionTokenUnavailableError);

    const unauthorized = Object.assign(new Error("Unauthorized"), {
      status: 401,
    });
    const serverError = Object.assign(new Error("Server error"), {
      status: 500,
    });

    expect(isUnauthorizedProtectedRequest(unauthorized)).toBe(true);
    expect(isUnauthorizedProtectedRequest(serverError)).toBe(false);
  });

  it("clears React Query and encrypted MMKV tokens during sign-out", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["private"], { email: "buyer@example.com" });
    const signOut = jest.fn(async () => undefined);
    const tokenCache = {
      clearAllTokens: jest.fn(async () => undefined),
    };

    await clearMobileSession({
      queryClient,
      signOut,
      tokenCache: tokenCache as never,
    });

    expect(queryClient.getQueryData(["private"])).toBeUndefined();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(tokenCache.clearAllTokens).toHaveBeenCalledTimes(1);
  });

  it("still clears local tokens when Clerk sign-out fails", async () => {
    const queryClient = new QueryClient();
    const tokenCache = {
      clearAllTokens: jest.fn(async () => undefined),
    };

    await expect(
      clearMobileSession({
        queryClient,
        signOut: jest.fn(async () => {
          throw new Error("offline");
        }),
        tokenCache: tokenCache as never,
      }),
    ).resolves.toBeUndefined();
    expect(tokenCache.clearAllTokens).toHaveBeenCalledTimes(1);
  });
});

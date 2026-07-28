import { useAuth, useClerk } from "@clerk/expo";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { ApiClientError } from "@chinasupply/api-client";

import { clerkTokenCache, type ManagedTokenCache } from "./clerk-token-cache";

export class SessionTokenUnavailableError extends Error {
  constructor() {
    super("Clerk session token is unavailable");
    this.name = "SessionTokenUnavailableError";
  }
}

export async function requestWithSessionToken(
  getToken: () => Promise<string | null>,
  signal?: AbortSignal,
): Promise<RequestInit> {
  const token = await getToken();
  if (token === null) throw new SessionTokenUnavailableError();

  return {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  };
}

export function isUnauthorizedProtectedRequest(error: unknown): boolean {
  return (
    error instanceof SessionTokenUnavailableError ||
    (error instanceof Error &&
      (error as ApiClientError<unknown>).status === 401)
  );
}

interface ClearMobileSessionOptions {
  queryClient: Pick<QueryClient, "clear">;
  signOut: () => Promise<unknown>;
  tokenCache?: ManagedTokenCache;
}

export async function clearMobileSession({
  queryClient,
  signOut,
  tokenCache = clerkTokenCache,
}: ClearMobileSessionOptions): Promise<void> {
  queryClient.clear();

  try {
    await signOut();
  } catch {
    // The local session is cleared below even when Clerk cannot reach its API.
  }

  try {
    await tokenCache.clearAllTokens();
  } catch {
    // Query data is already cleared; navigation must not be blocked by storage.
  }
}

export function useMobileProtectedApi() {
  const authentication = useAuth();
  const clerk = useClerk();
  const queryClient = useQueryClient();

  const getRequest = useCallback(
    (signal?: AbortSignal) =>
      requestWithSessionToken(authentication.getToken, signal),
    [authentication.getToken],
  );

  const signOutAndClear = useCallback(
    () =>
      clearMobileSession({
        queryClient,
        signOut: () => clerk.signOut(),
      }),
    [clerk, queryClient],
  );

  const handleProtectedError = useCallback(
    async (error: unknown) => {
      if (!isUnauthorizedProtectedRequest(error)) return false;
      await signOutAndClear();
      return true;
    },
    [signOutAndClear],
  );

  return {
    ...authentication,
    getRequest,
    handleProtectedError,
    signOutAndClear,
  };
}

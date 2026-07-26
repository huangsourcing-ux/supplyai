"use client";

import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { ApiClientError } from "@chinasupply/api-client";

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

export function useProtectedApi() {
  const authentication = useAuth();
  const { getToken, signOut } = authentication;
  const queryClient = useQueryClient();

  const getRequest = useCallback(
    (signal?: AbortSignal) => requestWithSessionToken(getToken, signal),
    [getToken],
  );

  const signOutAndClear = useCallback(
    async (redirectUrl = "/") => {
      queryClient.clear();
      try {
        await signOut({ redirectUrl });
      } catch {
        window.location.assign(redirectUrl);
      }
    },
    [queryClient, signOut],
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

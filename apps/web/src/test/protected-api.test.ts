import { describe, expect, it, vi } from "vitest";

import {
  SessionTokenUnavailableError,
  isUnauthorizedProtectedRequest,
  requestWithSessionToken,
} from "../auth/protected-api";

describe("protected API requests", () => {
  it("attaches the Clerk bearer token and preserves AbortSignal", async () => {
    const signal = new AbortController().signal;
    const getToken = vi.fn(async () => "session-token");

    await expect(requestWithSessionToken(getToken, signal)).resolves.toEqual({
      headers: { Authorization: "Bearer session-token" },
      signal,
    });
    expect(getToken).toHaveBeenCalledOnce();
  });

  it("rejects missing sessions before calling the API", async () => {
    await expect(
      requestWithSessionToken(async () => null),
    ).rejects.toBeInstanceOf(SessionTokenUnavailableError);
  });

  it("classifies missing tokens and API 401 responses for forced sign-out", () => {
    const unauthorized = Object.assign(new Error("unauthorized"), {
      status: 401,
    });
    const unavailable = Object.assign(new Error("unavailable"), {
      status: 503,
    });

    expect(
      isUnauthorizedProtectedRequest(new SessionTokenUnavailableError()),
    ).toBe(true);
    expect(isUnauthorizedProtectedRequest(unauthorized)).toBe(true);
    expect(isUnauthorizedProtectedRequest(unavailable)).toBe(false);
  });
});

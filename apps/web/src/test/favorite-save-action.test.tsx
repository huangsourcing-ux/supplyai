import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

const clerkState = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: false,
  signInButtonProps: undefined as
    | {
        forceRedirectUrl?: string;
        mode?: string;
        signUpForceRedirectUrl?: string;
        withSignUp?: boolean;
      }
    | undefined,
  userId: null as string | null,
}));

const mutationState = vi.hoisted(() => ({
  isError: false,
  isPending: false,
  isSuccess: false,
  mutate: vi.fn(),
}));
const runtime = vi.hoisted(() => ({
  getRequest: vi.fn(async () => ({
    headers: { Authorization: "Bearer fixture-token" },
  })),
  handleProtectedError: vi.fn(),
  invalidateQueries: vi.fn(),
  mutationOptions: undefined as
    | {
        mutationFn: () => Promise<unknown>;
        onSuccess: (response: {
          data: Record<string, unknown>;
        }) => Promise<void>;
      }
    | undefined,
  setQueryData: vi.fn(),
}));
const createFavoriteMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    forceRedirectUrl?: string;
    mode?: string;
    signUpForceRedirectUrl?: string;
    withSignUp?: boolean;
  }) => {
    clerkState.signInButtonProps = props;
    return React.cloneElement(
      React.Children.only(children) as React.ReactElement<
        Record<string, unknown>
      >,
      { "data-clerk-trigger": "true" },
    );
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: typeof runtime.mutationOptions) => {
    runtime.mutationOptions = options;
    return mutationState;
  },
  useQueryClient: () => ({
    invalidateQueries: runtime.invalidateQueries,
    setQueryData: runtime.setQueryData,
  }),
}));

vi.mock("@chinasupply/api-client", () => ({
  createFavorite: createFavoriteMock,
}));

vi.mock("../auth/protected-api", () => ({
  useProtectedApi: () => ({
    getRequest: runtime.getRequest,
    handleProtectedError: runtime.handleProtectedError,
    ...clerkState,
  }),
}));

import { FavoriteSaveAction } from "../app/(frontend)/favorites/favorite-save-action";

const labels = {
  checking: "Checking account…",
  error: "Could not save.",
  retry: "Try again",
  save: "Save factory",
  saved: "Saved",
  saving: "Saving…",
  signInHint: "Sign in to save this factory.",
};

afterEach(() => {
  clerkState.isLoaded = true;
  clerkState.isSignedIn = false;
  clerkState.signInButtonProps = undefined;
  clerkState.userId = null;
  mutationState.isError = false;
  mutationState.isPending = false;
  mutationState.isSuccess = false;
  mutationState.mutate.mockReset();
  runtime.getRequest.mockClear();
  runtime.handleProtectedError.mockClear();
  runtime.invalidateQueries.mockReset();
  runtime.mutationOptions = undefined;
  runtime.setQueryData.mockReset();
  createFavoriteMock.mockReset();
});

describe("favorite save authentication boundary", () => {
  it("returns signed-out users to the original factory", () => {
    const markup = renderToStaticMarkup(
      <FavoriteSaveAction
        labels={labels}
        returnPath="/factories/fixture-factory"
        targetId="fac000000000000000001"
        targetType="factory"
      />,
    );

    expect(markup).toContain(labels.signInHint);
    expect(markup).toContain('data-clerk-trigger="true"');
    expect(markup).not.toContain("disabled");
    expect(clerkState.signInButtonProps).toEqual({
      forceRedirectUrl: "/factories/fixture-factory",
      mode: "redirect",
      signUpForceRedirectUrl: "/factories/fixture-factory",
      withSignUp: true,
    });
  });

  it("renders an enabled API-backed save action for a signed-in user", () => {
    clerkState.isSignedIn = true;
    clerkState.userId = "user_fixture";

    const markup = renderToStaticMarkup(
      <FavoriteSaveAction
        labels={labels}
        returnPath="/clusters/fixture-cluster"
        targetId="clu000000000000000001"
        targetType="cluster"
      />,
    );

    expect(markup).toContain(labels.save);
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toContain("disabled");
    expect(clerkState.signInButtonProps).toBeUndefined();
  });

  it("renders a stable disabled state while Clerk loads", () => {
    clerkState.isLoaded = false;

    const markup = renderToStaticMarkup(
      <FavoriteSaveAction
        labels={labels}
        returnPath="/factories/fixture-factory"
        targetId="fac000000000000000001"
        targetType="factory"
      />,
    );

    expect(markup).toContain(labels.checking);
    expect(markup).toContain("disabled");
    expect(clerkState.signInButtonProps).toBeUndefined();
  });

  it("posts the target with a bearer token and invalidates that user's cache", async () => {
    clerkState.isSignedIn = true;
    clerkState.userId = "user_fixture";
    renderToStaticMarkup(
      <FavoriteSaveAction
        labels={labels}
        returnPath="/factories/fixture-factory"
        targetId="fac000000000000000001"
        targetType="factory"
      />,
    );
    const response = {
      data: {
        createdAt: "2026-07-26T12:00:00Z",
        id: "fav000000000000000001",
        target: null,
        targetId: "fac000000000000000001",
        targetType: "factory",
      },
      error: null,
      meta: {},
    };
    createFavoriteMock.mockResolvedValue(response);

    await runtime.mutationOptions?.mutationFn();

    expect(createFavoriteMock).toHaveBeenCalledWith(
      {
        targetId: "fac000000000000000001",
        targetType: "factory",
      },
      { headers: { Authorization: "Bearer fixture-token" } },
    );
    await runtime.mutationOptions?.onSuccess(response);
    expect(runtime.setQueryData).toHaveBeenCalledWith(
      ["favorites", "user_fixture"],
      expect.any(Function),
    );
    expect(runtime.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["favorites", "user_fixture"],
    });
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

const authState = vi.hoisted(() => ({
  getRequest: vi.fn(async (signal?: AbortSignal) => ({
    headers: { Authorization: "Bearer fixture-token" },
    signal,
  })),
  handleProtectedError: vi.fn(),
  isLoaded: true,
  isSignedIn: false,
  userId: null as string | null,
}));
const clerkState = vi.hoisted(() => ({
  signInButtonProps: undefined as Record<string, unknown> | undefined,
}));
const queryState = vi.hoisted(() => ({
  data: undefined as
    | {
        pageParams: (string | null)[];
        pages: Array<{
          data: Array<Record<string, unknown>>;
          error: null;
          meta: { nextCursor: string | null };
        }>;
      }
    | undefined,
  error: null as Error | null,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isError: false,
  isFetchingNextPage: false,
  isPending: false,
  refetch: vi.fn(),
}));
const captured = vi.hoisted(() => ({
  infiniteOptions: undefined as Record<string, unknown> | undefined,
}));
const getFavoritesMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children, ...props }: { children: React.ReactNode }) => {
    clerkState.signInButtonProps = props;
    return children;
  },
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...imageProps } = props;
    return React.createElement("img", {
      ...imageProps,
      alt: typeof imageProps.alt === "string" ? imageProps.alt : "",
    });
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: (options: Record<string, unknown>) => {
    captured.infiniteOptions = options;
    return queryState;
  },
  useMutation: () => ({
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: vi.fn(),
    variables: undefined,
  }),
  useQueryClient: () => ({
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}));

vi.mock("@chinasupply/api-client", () => ({
  deleteFavorite: vi.fn(),
  getFavorites: getFavoritesMock,
}));

vi.mock("../auth/protected-api", () => ({
  useProtectedApi: () => authState,
}));

import { FavoritesPageClient } from "../app/(frontend)/favorites/favorites-page-client";

const labels = {
  allLoaded: "All saved items are shown.",
  cluster: "Industrial clusters",
  description: "Saved description",
  empty: "Nothing saved.",
  error: "Load error",
  eyebrow: "Buyer shortlist",
  factory: "Factories",
  loadMore: "Load more",
  loading: "Loading…",
  loadingMore: "Loading more…",
  moreMayMatch: "More may match.",
  remove: "Remove",
  removeError: "Remove error",
  removed: "Removed",
  removing: "Removing…",
  retry: "Retry",
  signIn: "Sign in",
  signInDescription: "Private list",
  signInTitle: "Sign in title",
  title: "Saved suppliers",
  unavailable: "Saved item unavailable",
  unavailableDescription: "No longer public",
  unverified: "Unverified",
  verified: "Verified",
  viewDetails: "View details",
};

const factoryFavorite = {
  createdAt: "2026-07-26T12:00:00Z",
  id: "fav000000000000000001",
  targetId: "fac000000000000000001",
  targetType: "factory",
  target: {
    cluster: null,
    id: "fac000000000000000001",
    imageUrl: null,
    location: { coordinates: [113, 22], type: "Point" },
    mainProducts: ["Lighting"],
    name: "Fixture Factory",
    publishedAt: "2026-07-25T12:00:00Z",
    region: {
      id: "reg000000000000000001",
      level: "city",
      name: "Shenzhen",
    },
    slug: "fixture-factory",
    verified: true,
  },
};

const unavailableFactory = {
  createdAt: "2026-07-26T11:00:00Z",
  id: "fav000000000000000002",
  target: null,
  targetId: "fac000000000000000002",
  targetType: "factory",
};

afterEach(() => {
  authState.getRequest.mockClear();
  authState.handleProtectedError.mockClear();
  authState.isLoaded = true;
  authState.isSignedIn = false;
  authState.userId = null;
  clerkState.signInButtonProps = undefined;
  captured.infiniteOptions = undefined;
  getFavoritesMock.mockReset();
  queryState.data = undefined;
  queryState.error = null;
  queryState.hasNextPage = false;
  queryState.isError = false;
  queryState.isFetchingNextPage = false;
  queryState.isPending = false;
});

describe("favorites page", () => {
  it("shows a sign-in empty state without enabling the protected query", () => {
    const markup = renderToStaticMarkup(
      <FavoritesPageClient labels={labels} />,
    );

    expect(markup).toContain(labels.signInTitle);
    expect(markup).not.toContain(labels.error);
    expect(captured.infiniteOptions?.enabled).toBe(false);
    expect(clerkState.signInButtonProps).toMatchObject({
      forceRedirectUrl: "/favorites",
      signUpForceRedirectUrl: "/favorites",
    });
  });

  it("renders factory and unavailable cards without exposing target IDs", () => {
    authState.isSignedIn = true;
    authState.userId = "user_fixture";
    queryState.data = {
      pageParams: [null],
      pages: [
        {
          data: [factoryFavorite, unavailableFactory],
          error: null,
          meta: { nextCursor: null },
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <FavoritesPageClient labels={labels} />,
    );

    expect(markup).toContain("Fixture Factory");
    expect(markup).toContain(labels.unavailable);
    expect(markup).toContain('href="/factories/fixture-factory"');
    expect(markup).not.toContain("fac000000000000000002");
    expect(captured.infiniteOptions?.enabled).toBe(true);
    expect(captured.infiniteOptions?.queryKey).toEqual([
      "favorites",
      "user_fixture",
    ]);
  });

  it("passes cursor, bearer request, and abort signal to A-8", async () => {
    authState.isSignedIn = true;
    authState.userId = "user_fixture";
    renderToStaticMarkup(<FavoritesPageClient labels={labels} />);
    getFavoritesMock.mockResolvedValue({
      data: [],
      error: null,
      meta: { nextCursor: null },
    });
    const signal = new AbortController().signal;
    const queryFn = captured.infiniteOptions?.queryFn as (input: {
      pageParam: string;
      signal: AbortSignal;
    }) => Promise<unknown>;

    await queryFn({ pageParam: "opaque-page-2", signal });

    expect(authState.getRequest).toHaveBeenCalledWith(signal);
    expect(getFavoritesMock).toHaveBeenCalledWith(
      { cursor: "opaque-page-2", limit: 20 },
      {
        headers: { Authorization: "Bearer fixture-token" },
        signal,
      },
    );
  });
});

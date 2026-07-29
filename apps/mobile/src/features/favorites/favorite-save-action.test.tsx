import { createFavorite } from "@chinasupply/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useRouter } from "expo-router";

import "../../lib/i18n";
import { useMobileProtectedApi } from "../../lib/mobile-protected-api";
import { FavoriteSaveAction } from "./favorite-save-action";
import {
  getFavoritesQueryKey,
  type FavoritesInfiniteData,
} from "./favorites-cache";

jest.mock("../../lib/mobile-protected-api", () => ({
  useMobileProtectedApi: jest.fn(),
}));

const favorite = {
  createdAt: "2026-07-28T12:00:00Z",
  id: "fav000000000000000001",
  target: null,
  targetId: "clu000000000000000001",
  targetType: "cluster" as const,
};
const getRequest = jest.fn(async () => ({
  headers: { Authorization: "Bearer token" },
}));
const handleProtectedError = jest.fn(async () => false);
const push = jest.fn();

function configureAuth(signedIn: boolean) {
  jest.mocked(useMobileProtectedApi).mockReturnValue({
    getRequest,
    handleProtectedError,
    isLoaded: true,
    isSignedIn: signedIn,
    userId: signedIn ? "user_fixture" : null,
  } as unknown as ReturnType<typeof useMobileProtectedApi>);
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

function renderAction(queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <FavoriteSaveAction
        returnTo="/clusters/yiwu-small-commodities"
        targetId={favorite.targetId}
        targetType="cluster"
      />
    </QueryClientProvider>,
  );
}

describe("mobile favorite save action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useRouter)
      .mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(createFavorite).mockResolvedValue({
      data: favorite,
      error: null,
      meta: {},
    });
  });

  it("routes a signed-out buyer to login with the exact detail return path", () => {
    configureAuth(false);
    renderAction();

    fireEvent.press(screen.getByTestId("favorite-save-cluster"));

    expect(push).toHaveBeenCalledWith({
      params: { returnTo: "/clusters/yiwu-small-commodities" },
      pathname: "/sign-in",
    });
    expect(
      screen.getByText("Sign in to save this supplier and return here."),
    ).toBeOnTheScreen();
  });

  it("posts a Bearer-protected idempotent save and updates the user cache", async () => {
    configureAuth(true);
    const queryClient = createTestQueryClient();
    const queryKey = getFavoritesQueryKey("user_fixture");
    queryClient.setQueryData<FavoritesInfiniteData>(queryKey, {
      pageParams: [null],
      pages: [{ data: [], error: null, meta: { nextCursor: null } }],
    });
    renderAction(queryClient);

    fireEvent.press(screen.getByTestId("favorite-save-cluster"));

    await waitFor(() => {
      expect(createFavorite).toHaveBeenCalledWith(
        { targetId: favorite.targetId, targetType: "cluster" },
        { headers: { Authorization: "Bearer token" } },
      );
      expect(screen.getAllByText("Saved").length).toBeGreaterThan(0);
    });
    expect(
      queryClient.getQueryData<FavoritesInfiniteData>(queryKey)?.pages[0]
        ?.data[0]?.id,
    ).toBe(favorite.id);
  });

  it("recognizes a favorite already present in the current user's cache", () => {
    configureAuth(true);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData<FavoritesInfiniteData>(
      getFavoritesQueryKey("user_fixture"),
      {
        pageParams: [null],
        pages: [{ data: [favorite], error: null, meta: { nextCursor: null } }],
      },
    );
    renderAction(queryClient);

    expect(screen.getByTestId("favorite-save-cluster")).toBeDisabled();
    expect(screen.getAllByText("Saved").length).toBeGreaterThan(0);
    expect(createFavorite).not.toHaveBeenCalled();
  });

  it("delegates a protected-request failure to shared 401 handling", async () => {
    configureAuth(true);
    const unauthorized = Object.assign(new Error("Unauthorized"), {
      status: 401,
    });
    jest.mocked(createFavorite).mockRejectedValueOnce(unauthorized);
    renderAction();

    fireEvent.press(screen.getByTestId("favorite-save-cluster"));

    await waitFor(() => {
      expect(handleProtectedError).toHaveBeenCalledWith(unauthorized);
      expect(
        screen.getByText("This supplier could not be saved. Try again."),
      ).toBeOnTheScreen();
    });
  });
});

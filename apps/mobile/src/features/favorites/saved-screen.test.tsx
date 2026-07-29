import {
  deleteFavorite,
  getFavorites,
  type GetFavorites200,
  type GetFavorites200DataItem,
} from "@chinasupply/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useFocusEffect, useRouter } from "expo-router";

import "../../lib/i18n";
import { useMobileProtectedApi } from "../../lib/mobile-protected-api";
import SavedScreen from "./saved-screen";

jest.mock("../../lib/mobile-protected-api", () => ({
  useMobileProtectedApi: jest.fn(),
}));

const factoryFavorite: GetFavorites200DataItem = {
  createdAt: "2026-07-28T12:00:00Z",
  id: "fav000000000000000001",
  targetId: "fac000000000000000001",
  targetType: "factory",
  target: {
    cluster: {
      id: "clu000000000000000001",
      name: "Yiwu Small Commodities",
      slug: "yiwu-small-commodities",
    },
    id: "fac000000000000000001",
    imageUrl: null,
    location: { coordinates: [120.08, 29.31], type: "Point" },
    mainProducts: ["LED gifts", "Promotional goods"],
    name: "Yiwu Bright Goods Factory",
    publishedAt: "2026-07-02T00:00:00Z",
    region: {
      id: "reg000000000000000001",
      level: "city",
      name: "Yiwu",
    },
    slug: "yiwu-bright-goods",
    verified: true,
  },
};

const clusterFavorite: GetFavorites200DataItem = {
  createdAt: "2026-07-28T11:00:00Z",
  id: "fav000000000000000002",
  targetId: "clu000000000000000001",
  targetType: "cluster",
  target: {
    centroid: { coordinates: [120.075, 29.306], type: "Point" },
    coverImageUrl: null,
    factoryCount: 12,
    id: "clu000000000000000001",
    mainProducts: ["Small commodities", "Promotional goods"],
    name: "Yiwu Small Commodities",
    primaryCategory: {
      color: "#0F766E",
      icon: "gift",
      id: "cat000000000000000001",
      name: "Consumer Goods",
      parentId: null,
      slug: "consumer-goods",
      sortOrder: 10,
    },
    publishedAt: "2026-07-01T00:00:00Z",
    region: {
      id: "reg000000000000000001",
      level: "city",
      name: "Yiwu",
    },
    slug: "yiwu-small-commodities",
    summary: "A dense export-oriented manufacturing ecosystem.",
  },
};

const unavailableCluster: GetFavorites200DataItem = {
  createdAt: "2026-07-28T10:00:00Z",
  id: "fav000000000000000003",
  target: null,
  targetId: "clu000000000000000003",
  targetType: "cluster",
};

function page(
  data: GetFavorites200DataItem[],
  nextCursor: string | null = null,
): GetFavorites200 {
  return { data, error: null, meta: { nextCursor } };
}

const getRequest = jest.fn(async (signal?: AbortSignal) => ({
  headers: { Authorization: "Bearer token" },
  signal,
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

function renderSaved() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  return {
    queryClient,
    view: render(
      <QueryClientProvider client={queryClient}>
        <SavedScreen />
      </QueryClientProvider>,
    ),
  };
}

describe("mobile Saved tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureAuth(true);
    jest
      .mocked(useRouter)
      .mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest
      .mocked(getFavorites)
      .mockResolvedValue(page([factoryFavorite, clusterFavorite]));
    jest.mocked(deleteFavorite).mockResolvedValue({
      data: {
        absent: true,
        targetId: clusterFavorite.targetId,
        targetType: "cluster",
      },
      error: null,
      meta: {},
    });
  });

  it("shows a signed-out guidance state and returns through standalone auth", () => {
    configureAuth(false);
    renderSaved();

    expect(screen.getByTestId("saved-signed-out")).toBeOnTheScreen();
    expect(
      screen.getByText("Your saved suppliers will appear here"),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("saved-signed-out-action"));
    expect(push).toHaveBeenCalledWith({
      params: { returnTo: "/saved" },
      pathname: "/sign-in",
    });
    expect(getFavorites).not.toHaveBeenCalled();
  });

  it("loads Factories first, switches to clusters, routes details, and removes", async () => {
    jest
      .mocked(getFavorites)
      .mockResolvedValueOnce(page([factoryFavorite, clusterFavorite]))
      .mockResolvedValue(page([factoryFavorite]));
    renderSaved();

    expect(
      await screen.findByText("Yiwu Bright Goods Factory"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Yiwu Small Commodities")).toBeNull();

    fireEvent.press(screen.getByTestId("favorites-tab-cluster"));
    expect(screen.getByText("Yiwu Small Commodities")).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(`favorite-details-${clusterFavorite.id}`),
    );
    expect(push).toHaveBeenCalledWith({
      params: { slug: "yiwu-small-commodities" },
      pathname: "/clusters/[slug]",
    });

    fireEvent.press(
      screen.getByTestId(`favorite-remove-${clusterFavorite.id}`),
    );
    await waitFor(() => {
      expect(deleteFavorite).toHaveBeenCalledWith(
        "cluster",
        clusterFavorite.targetId,
        { headers: { Authorization: "Bearer token" } },
      );
      expect(screen.queryByText("Yiwu Small Commodities")).toBeNull();
    });
  });

  it("keeps unavailable targets removable without exposing draft content", async () => {
    jest.mocked(getFavorites).mockResolvedValue(page([unavailableCluster]));
    renderSaved();

    fireEvent.press(await screen.findByTestId("favorites-tab-cluster"));
    expect(
      await screen.findByText("Saved supplier unavailable"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`favorite-details-${unavailableCluster.id}`),
    ).toBeNull();
    expect(screen.queryByText("clu000000000000000003")).toBeNull();
  });

  it("does not report a false empty state when another cursor page may match", async () => {
    jest
      .mocked(getFavorites)
      .mockImplementation(async (params) =>
        params?.cursor === "opaque-next"
          ? page([factoryFavorite])
          : page([clusterFavorite], "opaque-next"),
      );
    renderSaved();

    expect(
      await screen.findByText(
        "More saved suppliers may match this section. Load the next page to continue.",
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("favorites-load-more"));
    expect(
      await screen.findByText("Yiwu Bright Goods Factory"),
    ).toBeOnTheScreen();
    expect(getFavorites).toHaveBeenLastCalledWith(
      { cursor: "opaque-next", limit: 20 },
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("retries initial failures and rolls back a failed optimistic removal", async () => {
    jest
      .mocked(getFavorites)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(page([factoryFavorite]));
    const { view } = renderSaved();

    expect(
      await screen.findByText("We could not load your saved suppliers"),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Try again"));
    expect(
      await screen.findByText("Yiwu Bright Goods Factory"),
    ).toBeOnTheScreen();

    jest.mocked(deleteFavorite).mockRejectedValueOnce(new Error("offline"));
    fireEvent.press(
      screen.getByTestId(`favorite-remove-${factoryFavorite.id}`),
    );
    expect(
      await screen.findByText(
        "This saved supplier could not be removed. Try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Yiwu Bright Goods Factory")).toBeOnTheScreen();
    expect(handleProtectedError).toHaveBeenCalled();

    view.unmount();
  });

  it("revalidates the user-scoped cache whenever Saved regains focus", async () => {
    jest
      .mocked(getFavorites)
      .mockResolvedValueOnce(page([factoryFavorite]))
      .mockResolvedValue(page([]));
    const { queryClient, view } = renderSaved();

    expect(
      await screen.findByText("Yiwu Bright Goods Factory"),
    ).toBeOnTheScreen();
    const focusCallback = jest.mocked(useFocusEffect).mock.calls.at(-1)?.[0];
    expect(focusCallback).toBeDefined();

    await act(async () => {
      focusCallback?.();
    });

    await waitFor(() => {
      expect(getFavorites).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("Yiwu Bright Goods Factory")).toBeNull();
    });

    view.unmount();
    queryClient.clear();
  });
});

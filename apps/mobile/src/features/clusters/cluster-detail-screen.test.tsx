import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { analytics } from "@chinasupply/analytics";
import {
  getClusterFactories,
  type GetCluster200Data,
  type GetClusterFactories200DataItem,
  useGetCluster,
} from "@chinasupply/api-client";

import "../../lib/i18n";
import { ClusterBoundaryMap } from "./cluster-boundary-map";
import ClusterDetailScreen, {
  ClusterDetailLoaded,
  ClusterDetailState,
} from "./cluster-detail-screen";

const cluster: GetCluster200Data = {
  boundary: {
    coordinates: [
      [
        [
          [120, 29],
          [121, 29],
          [121, 30],
          [120, 30],
          [120, 29],
        ],
      ],
    ],
    type: "MultiPolygon",
  },
  categories: [
    {
      color: "#0F766E",
      icon: "gift",
      id: "cat000000000000000001",
      name: "Consumer Goods",
      parentId: null,
      slug: "consumer-goods",
      sortOrder: 10,
    },
  ],
  centroid: { coordinates: [120.075, 29.306], type: "Point" },
  coverImageUrl: null,
  description:
    "## Global sourcing hub\n\n**Export ready.** with broad logistics coverage.",
  factoryCount: 12_345,
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
  stats: {
    annualOutputUsd: 1_250_000_000,
    exportShare: 0.625,
    note: "Public estimate",
  },
  summary: "A dense export-oriented manufacturing and wholesale ecosystem.",
};

const factory: GetClusterFactories200DataItem = {
  cluster: {
    id: cluster.id,
    name: cluster.name,
    slug: cluster.slug,
  },
  id: "fac000000000000000001",
  imageUrl: "https://media.example.test/factories/bright.webp",
  location: { coordinates: [120.08, 29.31], type: "Point" },
  mainProducts: ["LED gifts", "Promotional goods"],
  name: "Yiwu Bright Goods Factory",
  publishedAt: "2026-07-02T00:00:00Z",
  region: cluster.region,
  slug: "yiwu-bright-goods",
  verified: true,
};

function renderLoaded(
  overrides: Partial<Parameters<typeof ClusterDetailLoaded>[0]> = {},
) {
  return render(
    <ClusterDetailLoaded
      cluster={cluster}
      factories={[factory]}
      hasNextPage={false}
      isFetchNextPageError={false}
      isFetchingNextPage={false}
      isInitialFactoriesError={false}
      isInitialFactoriesLoading={false}
      onBack={jest.fn()}
      onFetchNextPage={jest.fn()}
      onRetryFactories={jest.fn()}
      {...overrides}
    />,
  );
}

describe("mobile cluster detail presentation", () => {
  it("renders every F-2.1 section and keeps future actions disabled", () => {
    renderLoaded();

    expect(screen.getByText(cluster.name)).toBeOnTheScreen();
    expect(screen.getByText("Yiwu, China")).toBeOnTheScreen();
    expect(screen.getByText("Small commodities")).toBeOnTheScreen();
    expect(screen.getByText("12,345")).toBeOnTheScreen();
    expect(screen.getByText("$1.3B")).toBeOnTheScreen();
    expect(screen.getByText("62.5%")).toBeOnTheScreen();
    expect(screen.getByText("Global sourcing hub")).toBeOnTheScreen();
    expect(screen.getByText(factory.name)).toBeOnTheScreen();
    expect(screen.getByText("Verified")).toBeOnTheScreen();
    expect(screen.getByTestId("cluster-save-placeholder")).toBeDisabled();
    expect(
      screen.getByTestId("cluster-factory-details-yiwu-bright-goods"),
    ).toBeDisabled();
    expect(
      screen.getByText("© MapTiler · © OpenStreetMap contributors"),
    ).toBeOnTheScreen();
  });

  it("hides optional stats and description while preserving factoryCount", () => {
    renderLoaded({
      cluster: {
        ...cluster,
        boundary: null,
        description: null,
        factoryCount: 0,
        stats: null,
      },
      factories: [],
    });

    expect(screen.getByText("0")).toBeOnTheScreen();
    expect(screen.queryByText("Annual output")).toBeNull();
    expect(screen.queryByText("Export share")).toBeNull();
    expect(screen.queryByText("About this industrial cluster")).toBeNull();
    expect(
      screen.getByText(
        "Boundary data is not available yet. Showing the cluster center.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "No published factories are available in this cluster yet.",
      ),
    ).toBeOnTheScreen();
  });

  it("loads the next page automatically and exposes a manual fallback", () => {
    const loadMore = jest.fn();
    renderLoaded({ hasNextPage: true, onFetchNextPage: loadMore });

    fireEvent.press(screen.getByText("Load more factories"));
    expect(loadMore).toHaveBeenCalledTimes(1);
    fireEvent.scroll(screen.getByTestId("cluster-detail-list"), {
      nativeEvent: {
        contentOffset: { y: 900 },
        contentSize: { height: 1200, width: 390 },
        layoutMeasurement: { height: 800, width: 390 },
      },
    });
    expect(loadMore).toHaveBeenCalled();
  });

  it("renders initial and subsequent factory failures with retry", () => {
    const retry = jest.fn();
    const { rerender } = renderLoaded({
      factories: [],
      isInitialFactoriesError: true,
      onRetryFactories: retry,
    });
    fireEvent.press(screen.getByText("Try again"));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(
      <ClusterDetailLoaded
        cluster={cluster}
        factories={[factory]}
        hasNextPage
        isFetchNextPageError
        isFetchingNextPage={false}
        isInitialFactoriesError={false}
        isInitialFactoriesLoading={false}
        onBack={jest.fn()}
        onFetchNextPage={retry}
        onRetryFactories={jest.fn()}
      />,
    );
    expect(
      screen.getByText("More factories could not be loaded."),
    ).toBeOnTheScreen();
  });
});

describe("mobile cluster detail states", () => {
  it("offers retry for service errors and only a map return for 404", () => {
    const retry = jest.fn();
    const back = jest.fn();
    const { rerender } = render(
      <ClusterDetailState kind="error" onBack={back} onRetry={retry} />,
    );

    fireEvent.press(screen.getByText("Try again"));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(<ClusterDetailState kind="not-found" onBack={back} />);
    expect(
      screen.getByText("This industrial cluster was not found"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Try again")).toBeNull();
  });

  it("renders map error retry and mandatory attribution", () => {
    render(
      <ClusterBoundaryMap
        boundary={cluster.boundary}
        centroid={cluster.centroid}
        color={cluster.primaryCategory.color}
        name={cluster.name}
      />,
    );

    fireEvent.press(screen.getByTestId("maplibre-fail-loading"));
    expect(
      screen.getByText("The map preview could not be loaded."),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Retry"));
    expect(screen.getByText("Loading map preview…")).toBeOnTheScreen();
    expect(
      screen.getByText("© MapTiler · © OpenStreetMap contributors"),
    ).toBeOnTheScreen();
  });
});

describe("mobile cluster detail route", () => {
  it("loads A-2/A-3 and sends the consent-aware cluster view facade once", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity, retry: false } },
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({
      slug: "yiwu-small-commodities",
    });
    jest.mocked(useRouter).mockReturnValue({
      back: jest.fn(),
      canDismiss: jest.fn(() => false),
      canGoBack: jest.fn(() => true),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
      dismissTo: jest.fn(),
      navigate: jest.fn(),
      prefetch: jest.fn(),
      push: jest.fn(),
      reload: jest.fn(),
      replace: jest.fn(),
      setParams: jest.fn(),
    });
    jest.mocked(useGetCluster).mockReturnValue({
      data: { data: cluster, error: null, meta: {} },
      error: null,
      isError: false,
      isPending: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGetCluster>);
    jest.mocked(getClusterFactories).mockResolvedValue({
      data: [factory],
      error: null,
      meta: { nextCursor: null },
    });

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <ClusterDetailScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getClusterFactories).toHaveBeenCalledWith(
        "yiwu-small-commodities",
        { limit: 20 },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
    expect(analytics.trackClusterViewed).toHaveBeenCalledTimes(1);
    expect(analytics.trackClusterViewed).toHaveBeenCalledWith({
      clusterId: cluster.id,
      slug: cluster.slug,
    });
    await waitFor(() => {
      expect(screen.getByText(factory.name)).toBeOnTheScreen();
    });
    unmount();
    queryClient.clear();
  });
});

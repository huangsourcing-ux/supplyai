import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactElement } from "react";

import { analytics } from "@chinasupply/analytics";
import {
  useGetCategories,
  useGetCluster,
  useGetFactory,
  useGetMapClusterBoundaries,
  useGetMapClusterPoints,
  useGetMapFactories,
  useSearch,
} from "@chinasupply/api-client";

import "../../lib/i18n";
import AppMapScreen from "./app-map-screen";
import {
  CLUSTER_BOUNDARIES_FILL_LAYER_ID,
  CLUSTER_BOUNDARIES_SOURCE_ID,
  CLUSTER_POINTS_LAYER_ID,
  CLUSTER_POINTS_SOURCE_ID,
  FACTORIES_SOURCE_ID,
  FACTORY_CLUSTER_COUNT_LAYER_ID,
  FACTORY_CLUSTERS_LAYER_ID,
  FACTORY_POINTS_LAYER_ID,
} from "./map-config";
import {
  CATEGORY_FILTER_DEBOUNCE_MS,
  SEARCH_DEBOUNCE_MS,
} from "./map-search-model";
import { MAP_VIEWPORT_DEBOUNCE_MS } from "./map-viewport";

function createQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    isError: false,
    isPending: false,
    isPlaceholderData: false,
    isSuccess: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

const categories = [
  {
    children: [],
    color: "#2563EB",
    icon: "cpu",
    id: "cat000000000000000001",
    name: "Electronics",
    parentId: null,
    slug: "electronics",
    sortOrder: 10,
  },
  {
    children: [],
    color: "#92400E",
    icon: "armchair",
    id: "cat000000000000000002",
    name: "Furniture",
    parentId: null,
    slug: "furniture",
    sortOrder: 20,
  },
] as const;

const searchData = {
  categories: [
    {
      color: "#92400E",
      id: "cat000000000000000002",
      name: "Furniture",
      slug: "furniture",
      type: "category" as const,
    },
  ],
  clusters: [
    {
      centroid: { coordinates: [120.075, 29.306], type: "Point" as const },
      factoryCount: 12,
      id: "clu000000000000000001",
      name: "Yiwu Small Commodities",
      slug: "yiwu-small-commodities",
      type: "cluster" as const,
    },
  ],
  factories: [
    {
      id: "fac000000000000000001",
      location: { coordinates: [120.08, 29.31], type: "Point" as const },
      name: "Yiwu Bright Goods Factory",
      slug: "yiwu-bright-goods",
      type: "factory" as const,
      verified: true,
    },
  ],
};

function renderMap(ui: ReactElement = <AppMapScreen />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const cancelQueries = jest.spyOn(queryClient, "cancelQueries");

  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  return { cancelQueries, queryClient };
}

describe("App map data sources", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useGetCategories)
      .mockReturnValue(
        createQueryResult() as unknown as ReturnType<typeof useGetCategories>,
      );
    jest
      .mocked(useGetCluster)
      .mockReturnValue(
        createQueryResult() as unknown as ReturnType<typeof useGetCluster>,
      );
    jest
      .mocked(useGetFactory)
      .mockReturnValue(
        createQueryResult() as unknown as ReturnType<typeof useGetFactory>,
      );
    jest
      .mocked(useGetMapClusterPoints)
      .mockReturnValue(
        createQueryResult() as unknown as ReturnType<
          typeof useGetMapClusterPoints
        >,
      );
    jest
      .mocked(useGetMapClusterBoundaries)
      .mockReturnValue(
        createQueryResult() as unknown as ReturnType<
          typeof useGetMapClusterBoundaries
        >,
      );
    jest
      .mocked(useGetMapFactories)
      .mockReturnValue(
        createQueryResult() as unknown as ReturnType<typeof useGetMapFactories>,
      );
    jest
      .mocked(useSearch)
      .mockReturnValue(
        createQueryResult() as unknown as ReturnType<typeof useSearch>,
      );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the shared map, all three real sources, business layers, and attribution", () => {
    renderMap();

    expect(screen.getByTestId("app-map")).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-source-${CLUSTER_POINTS_SOURCE_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-source-${CLUSTER_BOUNDARIES_SOURCE_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-source-${FACTORIES_SOURCE_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-layer-${CLUSTER_POINTS_LAYER_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-layer-${CLUSTER_BOUNDARIES_FILL_LAYER_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-layer-${FACTORY_CLUSTERS_LAYER_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-layer-${FACTORY_CLUSTER_COUNT_LAYER_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`maplibre-layer-${FACTORY_POINTS_LAYER_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("© MapTiler · © OpenStreetMap contributors"),
    ).toBeOnTheScreen();
  });

  it("waits 500ms before requesting zoom-gated MAP-2 and MAP-3 data", () => {
    jest.useFakeTimers();
    renderMap();

    fireEvent.press(screen.getByTestId("maplibre-region-did-change"));
    act(() => {
      jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS - 1);
    });
    expect(
      jest.mocked(useGetMapClusterBoundaries),
    ).not.toHaveBeenLastCalledWith(
      { bbox: "119.9,29.9,120.3,30.2", zoom: 10 },
      expect.anything(),
    );

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(jest.mocked(useGetMapClusterBoundaries)).toHaveBeenLastCalledWith(
      { bbox: "119.9,29.9,120.3,30.2", zoom: 10 },
      expect.objectContaining({
        query: expect.objectContaining({ enabled: true }),
      }),
    );
    expect(jest.mocked(useGetMapFactories)).toHaveBeenLastCalledWith(
      { bbox: "119.9,29.9,120.3,30.2" },
      expect.objectContaining({
        query: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  it("cancels viewport queries when native map movement starts", () => {
    const { cancelQueries } = renderMap();

    fireEvent.press(screen.getByTestId("maplibre-region-will-change"));

    expect(cancelQueries).toHaveBeenCalledTimes(2);
  });

  it("shows a retry action for data failure", () => {
    const refetch = jest.fn();
    jest
      .mocked(useGetMapClusterPoints)
      .mockReturnValue(
        createQueryResult({ isError: true, refetch }) as unknown as ReturnType<
          typeof useGetMapClusterPoints
        >,
      );
    renderMap();

    expect(screen.getByText("Map data could not be loaded.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Retry"));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("selects MAP-1 points and MAP-2 boundaries with immediate card data", () => {
    renderMap();

    fireEvent.press(
      screen.getByTestId(`maplibre-source-press-${CLUSTER_POINTS_SOURCE_ID}`),
    );
    expect(screen.getByText("Yiwu Small Commodities")).toBeOnTheScreen();
    expect(screen.getByText("12 factories")).toBeOnTheScreen();
    expect(screen.getByTestId("map-card-detail-skeleton")).toBeOnTheScreen();
    expect(jest.mocked(useGetCluster)).toHaveBeenLastCalledWith(
      "yiwu-small-commodities",
      expect.objectContaining({
        query: expect.objectContaining({ enabled: true }),
      }),
    );

    fireEvent.press(screen.getByTestId("map-card-close"));
    expect(screen.queryByTestId("map-selection-card")).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        `maplibre-source-press-${CLUSTER_BOUNDARIES_SOURCE_ID}`,
      ),
    );
    expect(screen.getByText("Yiwu Small Commodities")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("maplibre-map-press"));
    expect(screen.queryByTestId("map-selection-card")).not.toBeOnTheScreen();
  });

  it("selects MAP-3 factories and supplements the card with A-5", () => {
    jest.mocked(useGetFactory).mockReturnValue(
      createQueryResult({
        data: {
          data: {
            imageUrl: "https://media.example.test/factories/bright/cover.webp",
            mainProducts: ["LED gifts", "Promotional goods"],
          },
        },
      }) as unknown as ReturnType<typeof useGetFactory>,
    );
    renderMap();

    fireEvent.press(
      screen.getByTestId(`maplibre-source-press-${FACTORIES_SOURCE_ID}`),
    );

    expect(screen.getByText("Yiwu Bright Goods Factory")).toBeOnTheScreen();
    expect(screen.getByText("Verified")).toBeOnTheScreen();
    expect(screen.getByText("LED gifts")).toBeOnTheScreen();
    expect(jest.mocked(useGetFactory)).toHaveBeenLastCalledWith(
      "yiwu-bright-goods",
      expect.objectContaining({
        query: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  it("keeps MAP-1 identity visible and retries a failed A-2 detail request", () => {
    const refetch = jest.fn();
    jest
      .mocked(useGetCluster)
      .mockReturnValue(
        createQueryResult({ isError: true, refetch }) as unknown as ReturnType<
          typeof useGetCluster
        >,
      );
    renderMap();

    fireEvent.press(
      screen.getByTestId(`maplibre-source-press-${CLUSTER_POINTS_SOURCE_ID}`),
    );

    expect(screen.getByText("Yiwu Small Commodities")).toBeOnTheScreen();
    expect(screen.getByText("Details could not be loaded.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Retry"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("expands a factory cluster and clears an existing selection", async () => {
    const mapLibreMock = jest.requireMock(
      "@maplibre/maplibre-react-native",
    ) as {
      cameraEaseToMock: jest.Mock;
      clusterExpansionZoomMock: jest.Mock;
    };
    renderMap();

    fireEvent.press(
      screen.getByTestId(`maplibre-source-press-${CLUSTER_POINTS_SOURCE_ID}`),
    );
    expect(screen.getByTestId("map-selection-card")).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        `maplibre-source-press-${FACTORIES_SOURCE_ID}-cluster`,
      ),
    );

    expect(screen.queryByTestId("map-selection-card")).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(mapLibreMock.clusterExpansionZoomMock).toHaveBeenCalledWith(73);
      expect(mapLibreMock.cameraEaseToMock).toHaveBeenCalledWith({
        center: [120.08, 29.31],
        duration: 500,
        zoom: 13,
      });
    });
  });

  it("shows the localized MAP-3 truncation notice after the zoom gate", () => {
    jest.useFakeTimers();
    jest.mocked(useGetMapFactories).mockReturnValue(
      createQueryResult({
        data: {
          data: { features: [], type: "FeatureCollection" },
          error: null,
          meta: { truncated: true },
        },
      }) as unknown as ReturnType<typeof useGetMapFactories>,
    );
    renderMap();

    expect(screen.queryByTestId("map-truncation-notice")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("maplibre-region-did-change"));
    act(() => {
      jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS);
    });

    expect(screen.getByTestId("map-truncation-notice")).toHaveTextContent(
      "Zoom in to see all factories",
    );
  });

  it("skips the initial camera position and tracks later settled movement", () => {
    jest.useFakeTimers();
    renderMap();

    fireEvent.press(screen.getByTestId("maplibre-region-did-change"));
    act(() => {
      jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS);
    });
    expect(jest.mocked(analytics.trackMapMoved)).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("maplibre-region-will-change"));
    fireEvent.press(screen.getByTestId("maplibre-region-did-change"));
    act(() => {
      jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS);
    });

    expect(jest.mocked(analytics.trackMapMoved)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(analytics.trackMapMoved)).toHaveBeenCalledWith({
      bbox: "119.9,29.9,120.3,30.2",
      categorySlug: null,
      zoom: 10,
    });
  });

  it("enforces the input limit and waits exactly 300ms before searching", () => {
    jest.useFakeTimers();
    renderMap();
    const input = screen.getByTestId("map-search-input");

    expect(input.props.maxLength).toBe(100);
    fireEvent.changeText(input, "l");
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(jest.mocked(useSearch)).toHaveBeenLastCalledWith(
      { q: "xx" },
      expect.objectContaining({
        query: expect.objectContaining({ enabled: false }),
      }),
    );

    fireEvent.changeText(input, "led");
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(jest.mocked(useSearch)).not.toHaveBeenLastCalledWith(
      { q: "led" },
      expect.anything(),
    );

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(jest.mocked(useSearch)).toHaveBeenLastCalledWith(
      { q: "led" },
      expect.objectContaining({
        query: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  it("renders grouped results, hides stale results, and tracks each response once", () => {
    jest.useFakeTimers();
    jest.mocked(useSearch).mockReturnValue(
      createQueryResult({
        data: { data: searchData, error: null, meta: {} },
        dataUpdatedAt: 101,
        isSuccess: true,
      }) as unknown as ReturnType<typeof useSearch>,
    );
    renderMap();
    const input = screen.getByTestId("map-search-input");

    fireEvent.changeText(input, "led");
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText("Categories")).toBeOnTheScreen();
    expect(screen.getByText("Industrial clusters")).toBeOnTheScreen();
    expect(screen.getByText("Factories")).toBeOnTheScreen();
    expect(jest.mocked(analytics.trackSearchPerformed)).toHaveBeenCalledWith({
      query: "led",
      resultCount: 3,
    });

    fireEvent.changeText(input, "socks");
    expect(screen.queryByTestId("map-search-panel")).not.toBeOnTheScreen();
    fireEvent.changeText(input, "");
    fireEvent.changeText(input, "led");
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(jest.mocked(analytics.trackSearchPerformed)).toHaveBeenCalledTimes(
      1,
    );
  });

  it("retries a failed search without disturbing category chips", () => {
    jest.useFakeTimers();
    const refetch = jest.fn();
    jest.mocked(useGetCategories).mockReturnValue(
      createQueryResult({
        data: { data: categories },
      }) as unknown as ReturnType<typeof useGetCategories>,
    );
    jest
      .mocked(useSearch)
      .mockReturnValue(
        createQueryResult({ isError: true, refetch }) as unknown as ReturnType<
          typeof useSearch
        >,
      );
    renderMap();

    fireEvent.changeText(screen.getByTestId("map-search-input"), "led");
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText("Furniture")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("map-search-retry"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("clears stale map data and applies category to all MAP requests after 500ms", () => {
    jest.useFakeTimers();
    jest.mocked(useGetCategories).mockReturnValue(
      createQueryResult({
        data: { data: categories },
      }) as unknown as ReturnType<typeof useGetCategories>,
    );
    jest.mocked(useGetMapClusterPoints).mockReturnValue(
      createQueryResult({
        data: {
          data: {
            features: [{ type: "Feature" }],
            type: "FeatureCollection",
          },
        },
      }) as unknown as ReturnType<typeof useGetMapClusterPoints>,
    );
    const { cancelQueries } = renderMap();
    const mapLibreMock = jest.requireMock(
      "@maplibre/maplibre-react-native",
    ) as {
      cameraFitBoundsMock: jest.Mock;
    };

    fireEvent.press(screen.getByTestId("maplibre-region-did-change"));
    act(() => {
      jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS);
    });
    expect(
      screen.getByTestId(`maplibre-source-data-${CLUSTER_POINTS_SOURCE_ID}`),
    ).toHaveAccessibilityValue({ text: "1" });

    fireEvent.press(screen.getByTestId("map-category-furniture"));
    expect(cancelQueries).toHaveBeenCalledTimes(3);
    expect(
      screen.getByTestId(`maplibre-source-data-${CLUSTER_POINTS_SOURCE_ID}`),
    ).toHaveAccessibilityValue({ text: "0" });
    expect(mapLibreMock.cameraFitBoundsMock).toHaveBeenCalledWith(
      [73, 18, 135, 54],
      {
        duration: 700,
        padding: { bottom: 48, left: 24, right: 24, top: 48 },
      },
    );

    act(() => {
      jest.advanceTimersByTime(CATEGORY_FILTER_DEBOUNCE_MS - 1);
    });
    expect(jest.mocked(useGetMapClusterPoints)).not.toHaveBeenLastCalledWith(
      { category: "furniture" },
      expect.anything(),
    );

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(jest.mocked(useGetMapClusterPoints)).toHaveBeenLastCalledWith(
      { category: "furniture" },
      expect.objectContaining({
        query: expect.objectContaining({ enabled: true }),
      }),
    );
    expect(jest.mocked(useGetMapClusterBoundaries)).toHaveBeenLastCalledWith(
      {
        bbox: "119.9,29.9,120.3,30.2",
        category: "furniture",
        zoom: 10,
      },
      expect.anything(),
    );
    expect(jest.mocked(useGetMapFactories)).toHaveBeenLastCalledWith(
      { bbox: "119.9,29.9,120.3,30.2", category: "furniture" },
      expect.anything(),
    );
  });

  it("flies to cluster and factory search results with immediate cards", () => {
    jest.useFakeTimers();
    jest.mocked(useSearch).mockReturnValue(
      createQueryResult({
        data: { data: searchData, error: null, meta: {} },
        dataUpdatedAt: 202,
        isSuccess: true,
      }) as unknown as ReturnType<typeof useSearch>,
    );
    renderMap();
    const mapLibreMock = jest.requireMock(
      "@maplibre/maplibre-react-native",
    ) as {
      cameraFlyToMock: jest.Mock;
    };
    const input = screen.getByTestId("map-search-input");

    fireEvent.changeText(input, "led");
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    fireEvent.press(
      screen.getByTestId("map-search-result-cluster-yiwu-small-commodities"),
    );
    expect(mapLibreMock.cameraFlyToMock).toHaveBeenCalledWith({
      center: [120.075, 29.306],
      duration: 700,
      zoom: 9,
    });
    expect(screen.getByText("Yiwu Small Commodities")).toBeOnTheScreen();

    fireEvent(input, "focus");
    fireEvent.press(
      screen.getByTestId("map-search-result-factory-yiwu-bright-goods"),
    );
    expect(mapLibreMock.cameraFlyToMock).toHaveBeenLastCalledWith({
      center: [120.08, 29.31],
      duration: 700,
      zoom: 13,
    });
    expect(screen.getByText("Yiwu Bright Goods Factory")).toBeOnTheScreen();
  });

  it("keeps an exact child search result as a removable MAP filter", () => {
    jest.useFakeTimers();
    jest.mocked(useGetCategories).mockReturnValue(
      createQueryResult({
        data: { data: categories },
      }) as unknown as ReturnType<typeof useGetCategories>,
    );
    jest.mocked(useSearch).mockReturnValue(
      createQueryResult({
        data: {
          data: {
            categories: [
              {
                color: null,
                id: "chi000000000000000001",
                name: "Home Furniture",
                slug: "home-furniture",
                type: "category",
              },
            ],
            clusters: [],
            factories: [],
          },
          error: null,
          meta: {},
        },
        dataUpdatedAt: 303,
        isSuccess: true,
      }) as unknown as ReturnType<typeof useSearch>,
    );
    renderMap();

    fireEvent.changeText(screen.getByTestId("map-search-input"), "sofa");
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    fireEvent.press(
      screen.getByTestId("map-search-result-category-home-furniture"),
    );
    expect(
      screen.getByLabelText("Remove Home Furniture filter"),
    ).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(CATEGORY_FILTER_DEBOUNCE_MS);
    });
    expect(jest.mocked(useGetMapClusterPoints)).toHaveBeenLastCalledWith(
      { category: "home-furniture" },
      expect.anything(),
    );
  });

  it("tracks settled movement with the applied category slug", () => {
    jest.useFakeTimers();
    jest.mocked(useGetCategories).mockReturnValue(
      createQueryResult({
        data: { data: categories },
      }) as unknown as ReturnType<typeof useGetCategories>,
    );
    renderMap();

    fireEvent.press(screen.getByTestId("map-category-furniture"));
    act(() => {
      jest.advanceTimersByTime(CATEGORY_FILTER_DEBOUNCE_MS);
    });
    fireEvent.press(screen.getByTestId("maplibre-region-did-change"));
    act(() => {
      jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS);
    });
    fireEvent.press(screen.getByTestId("maplibre-region-will-change"));
    fireEvent.press(screen.getByTestId("maplibre-region-did-change"));
    act(() => {
      jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS);
    });

    expect(jest.mocked(analytics.trackMapMoved)).toHaveBeenCalledWith({
      bbox: "119.9,29.9,120.3,30.2",
      categorySlug: "furniture",
      zoom: 10,
    });
  });
});

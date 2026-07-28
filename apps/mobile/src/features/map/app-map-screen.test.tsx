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
  useGetCluster,
  useGetFactory,
  useGetMapClusterBoundaries,
  useGetMapClusterPoints,
  useGetMapFactories,
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
import { MAP_VIEWPORT_DEBOUNCE_MS } from "./map-viewport";

function createQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

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
    jest.useFakeTimers({
      // React Native's scheduler needs real microtask primitives. Faking them
      // makes Jest spin during teardown on Linux runners.
      doNotFake: ["nextTick", "queueMicrotask", "setImmediate"],
    });
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
    jest.useFakeTimers({
      doNotFake: ["nextTick", "queueMicrotask", "setImmediate"],
    });
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
    jest.useFakeTimers({
      doNotFake: ["nextTick", "queueMicrotask", "setImmediate"],
    });
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
});

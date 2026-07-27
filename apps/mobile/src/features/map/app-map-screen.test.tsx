import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

import {
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
});

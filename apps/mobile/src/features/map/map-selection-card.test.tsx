import { fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import "../../lib/i18n";
import {
  type MapSelectionCardLabels,
  MapSelectionCard,
  MapSelectionCardView,
} from "./map-selection-card";
import type { SelectedMapFeature } from "./map-selection";

const clusterSelection: SelectedMapFeature = {
  factoryCount: 12,
  id: "clu_12345678901234567",
  kind: "cluster",
  name: "Yiwu Small Commodities",
  slug: "yiwu-small-commodities",
};

const factorySelection: SelectedMapFeature = {
  clusterId: "clu_12345678901234567",
  id: "fac_12345678901234567",
  kind: "factory",
  name: "Yiwu Bright Goods Factory",
  slug: "yiwu-bright-goods",
  verified: true,
};

function labels(
  overrides: Partial<MapSelectionCardLabels> = {},
): MapSelectionCardLabels {
  return {
    close: "Close details",
    detailError: "Details could not be loaded.",
    entityType: "Industrial cluster",
    factoryCountOrVerification: "12 factories",
    loadingDetails: "Loading details",
    mainProducts: "Main products",
    retry: "Retry",
    viewDetails: "View cluster details",
    ...overrides,
  };
}

describe("mobile map selection card", () => {
  it("renders MAP identity immediately and enables the available cluster route", () => {
    const onViewDetails = jest.fn();
    render(
      <MapSelectionCardView
        detail={{ status: "loading" }}
        labels={labels()}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onViewDetails={onViewDetails}
        selection={clusterSelection}
      />,
    );

    expect(screen.getByText("Yiwu Small Commodities")).toBeOnTheScreen();
    expect(screen.getByText("12 factories")).toBeOnTheScreen();
    expect(screen.getByTestId("map-card-detail-skeleton")).toBeOnTheScreen();
    expect(screen.getByTestId("map-card-details-cta")).toBeEnabled();
    expect(screen.getByText("View cluster details")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("map-card-details-cta"));
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it("renders A-5 image and products while keeping the future native CTA disabled", () => {
    render(
      <MapSelectionCardView
        detail={{
          imageUrl: "https://media.example.test/factories/bright/cover.webp",
          mainProducts: ["LED gifts", "Promotional goods"],
          status: "ready",
        }}
        labels={labels({
          entityType: "Factory",
          factoryCountOrVerification: "Verified",
          viewDetails: "View factory details",
        })}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        selection={factorySelection}
      />,
    );

    expect(screen.getByText("Verified")).toBeOnTheScreen();
    expect(screen.getByText("LED gifts")).toBeOnTheScreen();
    expect(screen.getByText("Promotional goods")).toBeOnTheScreen();
    expect(screen.getByTestId("map-card-image")).toHaveProp("source", {
      uri: "https://media.example.test/factories/bright/cover.webp",
    });
    expect(screen.getByTestId("map-card-details-cta")).toBeDisabled();
  });

  it("preserves the selection and exposes retry when detail loading fails", () => {
    const onClose = jest.fn();
    const onRetry = jest.fn();
    render(
      <MapSelectionCardView
        detail={{ status: "error" }}
        labels={labels()}
        onClose={onClose}
        onRetry={onRetry}
        selection={clusterSelection}
      />,
    );

    expect(screen.getByText("Yiwu Small Commodities")).toBeOnTheScreen();
    expect(screen.getByText("Details could not be loaded.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId("map-card-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pushes the cluster slug through the Expo Router container", () => {
    const push = jest.fn();
    jest.mocked(useRouter).mockReturnValue({
      back: jest.fn(),
      canDismiss: jest.fn(() => false),
      canGoBack: jest.fn(() => true),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
      dismissTo: jest.fn(),
      navigate: jest.fn(),
      prefetch: jest.fn(),
      push,
      reload: jest.fn(),
      replace: jest.fn(),
      setParams: jest.fn(),
    });

    render(
      <MapSelectionCard onClose={jest.fn()} selection={clusterSelection} />,
    );

    fireEvent.press(screen.getByTestId("map-card-details-cta"));
    expect(push).toHaveBeenCalledWith({
      params: { slug: "yiwu-small-commodities" },
      pathname: "/clusters/[slug]",
    });
  });
});

import { fireEvent, render, screen } from "@testing-library/react-native";

import "../lib/i18n";
import MapSpikeScreen from "../app/index";

describe("MapLibre compatibility spike screen", () => {
  it("renders the offline fixture, legend, attribution, and loading state", () => {
    render(<MapSpikeScreen />);

    expect(screen.getByText("Yiwu offline map fixture")).toBeOnTheScreen();
    expect(screen.getByText("Loading offline map…")).toBeOnTheScreen();
    expect(screen.getByText("Point")).toBeOnTheScreen();
    expect(screen.getByText("Polygon")).toBeOnTheScreen();
    expect(screen.getByText("Cluster")).toBeOnTheScreen();
    expect(
      screen.getByText("© MapTiler · © OpenStreetMap contributors"),
    ).toBeOnTheScreen();
  });

  it("shows ready and explicit failure states from native map callbacks", () => {
    render(<MapSpikeScreen />);

    fireEvent.press(screen.getByTestId("maplibre-finish-rendering"));
    expect(screen.getByText("Offline map ready")).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("maplibre-fail-loading"));
    expect(screen.getByText("Map failed to load")).toBeOnTheScreen();
  });
});

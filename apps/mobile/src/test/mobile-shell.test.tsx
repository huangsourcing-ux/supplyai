import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";

import "../lib/i18n";
import AppMapScreen from "../app/index";

function renderAppMap() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppMapScreen />
    </QueryClientProvider>,
  );
}

describe("public mobile map shell", () => {
  it("renders map data loading and attribution without an authentication gate", () => {
    renderAppMap();

    expect(screen.getByTestId("app-map")).toBeOnTheScreen();
    expect(screen.getByText("Loading map data…")).toBeOnTheScreen();
    expect(
      screen.getByText("© MapTiler · © OpenStreetMap contributors"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Sign in to ChinaSupply.AI")).toBeNull();
  });

  it("shows explicit native map failure and retry states", () => {
    renderAppMap();

    fireEvent.press(screen.getByTestId("maplibre-finish-rendering"));
    expect(screen.queryByText("Loading map data…")).toBeNull();

    fireEvent.press(screen.getByTestId("maplibre-fail-loading"));
    expect(screen.getByText("Map could not be loaded.")).toBeOnTheScreen();
    expect(screen.getByText("Retry")).toBeOnTheScreen();
  });
});

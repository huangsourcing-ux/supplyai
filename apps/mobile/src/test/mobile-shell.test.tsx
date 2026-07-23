import { fireEvent, render, screen } from "@testing-library/react-native";
import { useAuth } from "@clerk/expo";

import "../lib/i18n";
import MapSpikeScreen from "../app/index";

describe("MapLibre compatibility spike screen", () => {
  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
  });

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

describe("Clerk authentication gate", () => {
  it("shows a loading state while Clerk restores its session", () => {
    jest.mocked(useAuth).mockReturnValue({
      isLoaded: false,
      isSignedIn: undefined,
    } as ReturnType<typeof useAuth>);

    render(<MapSpikeScreen />);

    expect(screen.getByText("Loading secure sign in…")).toBeOnTheScreen();
  });

  it("shows the email and password screen when signed out", () => {
    jest.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    } as ReturnType<typeof useAuth>);

    render(<MapSpikeScreen />);

    expect(screen.getByText("Sign in to ChinaSupply.AI")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email address")).toBeOnTheScreen();
    expect(screen.getByLabelText("Password")).toBeOnTheScreen();
  });
});

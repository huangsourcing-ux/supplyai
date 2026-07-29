import { useAuth } from "@clerk/expo";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import "../../lib/i18n";
import SignInRoute, { normalizeAuthReturnTo } from "./sign-in-route";

const back = jest.fn();
const replace = jest.fn();

describe("mobile sign-in return route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    } as ReturnType<typeof useAuth>);
    jest.mocked(useRouter).mockReturnValue({
      back,
      canGoBack: jest.fn(() => true),
      replace,
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("allows only Saved and supplier-detail return paths", () => {
    expect(normalizeAuthReturnTo("/saved")).toBe("/saved");
    expect(normalizeAuthReturnTo("/clusters/yiwu-small-commodities")).toBe(
      "/clusters/yiwu-small-commodities",
    );
    expect(normalizeAuthReturnTo("/factories/yiwu-bright-goods")).toBe(
      "/factories/yiwu-bright-goods",
    );
    expect(normalizeAuthReturnTo("https://evil.example.test")).toBe("/saved");
    expect(normalizeAuthReturnTo("/account")).toBe("/saved");
    expect(normalizeAuthReturnTo(["/clusters/valid-slug", "/account"])).toBe(
      "/clusters/valid-slug",
    );
  });

  it("returns back natively and redirects to the detail when auth becomes active", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({
      returnTo: "/factories/yiwu-bright-goods",
    });
    const view = render(<SignInRoute />);

    fireEvent.press(screen.getByTestId("auth-back"));
    expect(back).toHaveBeenCalledTimes(1);

    jest.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    view.rerender(<SignInRoute />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/factories/yiwu-bright-goods"),
    );
  });

  it("redirects an already signed-in user without rendering auth again", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ returnTo: "/saved" });
    jest.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    render(<SignInRoute />);

    expect(screen.getByTestId("sign-in-route-loading")).toBeOnTheScreen();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/saved"));
  });
});

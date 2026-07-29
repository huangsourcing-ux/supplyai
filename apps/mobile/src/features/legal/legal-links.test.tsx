import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";

import "../../lib/i18n";
import LegalLinks from "./legal-links";

describe("mobile legal links", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(WebBrowser.openBrowserAsync).mockResolvedValue({
      type: WebBrowser.WebBrowserResultType.DISMISS,
    });
  });

  it("opens local and staging links in the in-app browser", async () => {
    render(<LegalLinks variant="notice" />);

    expect(screen.getByText(/By creating an account/)).toBeOnTheScreen();
    expect(screen.getByTestId("legal-privacy-link")).toHaveProp(
      "accessibilityRole",
      "link",
    );

    fireEvent.press(screen.getByTestId("legal-privacy-link"));
    fireEvent.press(screen.getByTestId("legal-terms-link"));

    await waitFor(() => {
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        "https://staging.chinasupply.ai/privacy",
      );
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        "https://staging.chinasupply.ai/terms",
      );
    });
  });

  it("shows a localized retry action when the browser cannot open", async () => {
    jest
      .mocked(WebBrowser.openBrowserAsync)
      .mockRejectedValueOnce(new Error("private browser error"));
    render(<LegalLinks variant="account" />);

    fireEvent.press(screen.getByTestId("legal-privacy-link"));

    expect(
      await screen.findByText(
        "This page could not be opened. Check your connection and try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("private browser error")).toBeNull();

    fireEvent.press(screen.getByTestId("legal-open-retry"));

    await waitFor(() =>
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(2),
    );
  });
});

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as Sentry from "@sentry/react-native";

import "../../lib/i18n";
import { MobileSentrySmoke } from "./sentry-smoke";

describe("Mobile Sentry smoke control", () => {
  it("captures, flushes, and reports the tagged exception event id", async () => {
    render(<MobileSentrySmoke />);

    fireEvent.press(
      screen.getByRole("button", {
        name: "Send Mobile Sentry test exception",
      }),
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "M0-T7 Mobile Sentry smoke test",
      }),
      {
        tags: {
          component: "mobile",
          smoke_test: "m0-t7",
        },
      },
    );
    expect(Sentry.flush).toHaveBeenCalledWith();
    await waitFor(() => {
      expect(
        screen.getByText(
          "Sentry dev event sent: 0123456789abcdef0123456789abcdef",
        ),
      ).toBeOnTheScreen();
    });
  });
});

import { render, screen } from "@testing-library/react-native";

import "../../lib/i18n";
import { ApiHealthStatusView, type ApiHealthState } from "./api-health-status";

describe("Mobile API health status", () => {
  it.each([
    ["loading", "Checking API liveness…"],
    ["ready", "API liveness check passed"],
    ["error", "API liveness check failed"],
  ] as const)("renders the %s state", (state: ApiHealthState, label) => {
    render(<ApiHealthStatusView state={state} />);

    expect(screen.getByTestId("api-health-status")).toBeOnTheScreen();
    expect(screen.getByText(label)).toBeOnTheScreen();
  });
});

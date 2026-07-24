import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import {
  ApiHealthStatusView,
  type ApiHealthState,
} from "../app/(frontend)/ops/api-health-status";

const labels = {
  error: "API liveness check failed",
  loading: "Checking API liveness…",
  ready: "API liveness check passed",
};

describe("Web API health status", () => {
  it.each([
    ["loading", labels.loading],
    ["ready", labels.ready],
    ["error", labels.error],
  ] as const)("renders the %s state", (state: ApiHealthState, label) => {
    const markup = renderToStaticMarkup(
      <ApiHealthStatusView labels={labels} state={state} />,
    );

    expect(markup).toContain(`data-state="${state}"`);
    expect(markup).toContain(label);
  });
});

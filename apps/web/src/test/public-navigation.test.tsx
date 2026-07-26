import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

const navigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

import { PublicNavigation } from "../app/(frontend)/public-navigation";

const labels = {
  account: "Account",
  analytics: "Analytics",
  brand: "ChinaSupply.AI",
  map: "Map",
  saved: "Saved",
};

afterEach(() => {
  navigationState.pathname = "/";
});

describe("public navigation", () => {
  it("links all buyer routes and identifies the current page", () => {
    navigationState.pathname = "/favorites";
    const markup = renderToStaticMarkup(<PublicNavigation labels={labels} />);

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/favorites"');
    expect(markup).toContain('href="/account"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('href="/favorites">Saved</a>');
    expect(markup).toContain("Analytics</button>");
    expect(markup).toContain('aria-controls="analytics-consent-panel"');
  });

  it("stays out of public and operations sign-in flows", () => {
    navigationState.pathname = "/sign-in";
    expect(renderToStaticMarkup(<PublicNavigation labels={labels} />)).toBe("");

    navigationState.pathname = "/ops/factories";
    expect(renderToStaticMarkup(<PublicNavigation labels={labels} />)).toBe("");
  });
});

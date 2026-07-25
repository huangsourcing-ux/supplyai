import { describe, expect, it, vi } from "vitest";

import { createAnalyticsClient, sanitizeSearchQuery } from "./index.js";

describe("consent-aware analytics", () => {
  it("is a complete no-op before consent and after denial", () => {
    const capture = vi.fn();
    const client = createAnalyticsClient();
    client.configureCapture(capture);

    client.trackSearchPerformed({ query: "led", resultCount: 4 });
    client.trackClusterViewed({
      clusterId: "clu000000000000000001",
      slug: "yiwu-small-commodities",
    });
    client.setConsent("denied");
    client.trackSearchPerformed({ query: "socks", resultCount: 2 });

    expect(client.getConsent()).toBe("denied");
    expect(capture).not.toHaveBeenCalled();
  });

  it("remains a no-op without a configured adapter", () => {
    const client = createAnalyticsClient();
    client.setConsent("granted");

    expect(() => {
      client.trackSearchPerformed({ query: "sofa", resultCount: 3 });
    }).not.toThrow();
  });

  it("captures the frozen search event after consent", () => {
    const capture = vi.fn();
    const client = createAnalyticsClient();
    client.configureCapture(capture);
    client.setConsent("granted");

    client.trackSearchPerformed({
      query: " led   lighting ",
      resultCount: 7.9,
    });

    expect(capture).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith("search_performed", {
      query: "led lighting",
      resultCount: 7,
    });
  });
});

describe("catalog view analytics", () => {
  it("captures the frozen cluster view event after consent", () => {
    const capture = vi.fn();
    const client = createAnalyticsClient();
    client.configureCapture(capture);
    client.setConsent("granted");

    client.trackClusterViewed({
      clusterId: "clu000000000000000001",
      slug: "yiwu-small-commodities",
    });

    expect(capture).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith("cluster_viewed", {
      clusterId: "clu000000000000000001",
      slug: "yiwu-small-commodities",
    });
  });
});

describe("search query privacy filter", () => {
  it("redacts email and phone-like values before capture", () => {
    expect(
      sanitizeSearchQuery(
        "email buyer@example.com or +86 (138) 0013-8000 about led",
      ),
    ).toBe("email [redacted] or [redacted] about led");
  });

  it("does not redact short numeric product terms", () => {
    expect(sanitizeSearchQuery("model 2026 led 5050")).toBe(
      "model 2026 led 5050",
    );
  });

  it("limits the sanitized value to 100 Unicode characters", () => {
    const sanitized = sanitizeSearchQuery(`${"家".repeat(99)}🏭extra`);

    expect(Array.from(sanitized)).toHaveLength(100);
    expect(sanitized.endsWith("🏭")).toBe(true);
  });
});

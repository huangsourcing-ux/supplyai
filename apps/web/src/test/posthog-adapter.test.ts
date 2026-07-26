import { describe, expect, it, vi } from "vitest";

import { createPostHogAdapter } from "../analytics/posthog-adapter";

describe("PostHog Web adapter", () => {
  it("initializes opted out with every automatic collection surface disabled", () => {
    const client = {
      capture: vi.fn(),
      init: vi.fn(),
      opt_in_capturing: vi.fn(),
      opt_out_capturing: vi.fn(),
    } as unknown as Parameters<typeof createPostHogAdapter>[0];
    const adapter = createPostHogAdapter(
      client,
      "phc_fixture_only",
      "https://posthog.fixture.invalid",
    );

    expect(client.init).toHaveBeenCalledWith("phc_fixture_only", {
      advanced_disable_flags: true,
      api_host: "https://posthog.fixture.invalid",
      autocapture: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_pageleave: false,
      capture_pageview: false,
      capture_performance: false,
      defaults: "2026-05-30",
      disable_conversations: true,
      disable_external_dependency_loading: true,
      disable_product_tours: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      opt_in_site_apps: false,
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      persistence: "localStorage",
      rageclick: false,
      respect_dnt: true,
    });

    adapter.optIn();
    expect(client.opt_in_capturing).toHaveBeenCalledWith({
      captureEventName: false,
    });

    adapter.capture("cluster_viewed", {
      clusterId: "cluster-1",
      slug: "led",
    });
    expect(client.capture).toHaveBeenCalledWith("cluster_viewed", {
      clusterId: "cluster-1",
      slug: "led",
    });

    adapter.optOut();
    expect(client.opt_out_capturing).toHaveBeenCalledOnce();
  });
});

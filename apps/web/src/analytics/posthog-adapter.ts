import type { AnalyticsCapture } from "@chinasupply/analytics";
import type posthog from "posthog-js";

export interface WebAnalyticsAdapter {
  capture: AnalyticsCapture;
  optIn(): void;
  optOut(): void;
}

type PostHogClient = Pick<
  typeof posthog,
  "capture" | "init" | "opt_in_capturing" | "opt_out_capturing"
>;

export function createPostHogAdapter(
  client: PostHogClient,
  projectKey: string,
  host: string,
): WebAnalyticsAdapter {
  client.init(projectKey, {
    advanced_disable_flags: true,
    api_host: host,
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

  const capture = ((event: string, properties: object) => {
    client.capture(event, properties);
  }) as AnalyticsCapture;

  return {
    capture,
    optIn() {
      client.opt_in_capturing({ captureEventName: false });
    },
    optOut() {
      client.opt_out_capturing();
    },
  };
}

let adapterPromise: Promise<WebAnalyticsAdapter> | null = null;

export function loadPostHogAdapter(): Promise<WebAnalyticsAdapter> {
  adapterPromise ??= import("posthog-js").then(({ default: posthogClient }) =>
    createPostHogAdapter(
      posthogClient,
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    ),
  );

  return adapterPromise;
}

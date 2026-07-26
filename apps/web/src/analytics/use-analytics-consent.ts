"use client";

import { useSyncExternalStore } from "react";

import { analytics, type AnalyticsConsent } from "@chinasupply/analytics";

const getServerSnapshot = (): AnalyticsConsent => "unknown";

export function useAnalyticsConsent(): AnalyticsConsent {
  return useSyncExternalStore(
    analytics.subscribe,
    analytics.getConsent,
    getServerSnapshot,
  );
}

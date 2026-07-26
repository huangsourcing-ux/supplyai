"use client";

import React, { useEffect, useRef } from "react";

import { analytics } from "@chinasupply/analytics";

import { useAnalyticsConsent } from "@/analytics/use-analytics-consent";

export function FactoryViewTracker({
  factoryId,
  slug,
}: Readonly<{
  factoryId: string;
  slug: string;
}>) {
  const consent = useAnalyticsConsent();
  const trackedIdentity = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== "granted") return;

    const identity = `${factoryId}:${slug}`;
    if (trackedIdentity.current === identity) return;
    trackedIdentity.current = identity;
    analytics.trackFactoryViewed({ factoryId, slug });
  }, [consent, factoryId, slug]);

  return null;
}

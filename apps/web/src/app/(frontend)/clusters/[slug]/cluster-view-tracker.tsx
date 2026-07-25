"use client";

import React, { useEffect, useRef } from "react";

import { analytics } from "@chinasupply/analytics";

export function ClusterViewTracker({
  clusterId,
  slug,
}: Readonly<{
  clusterId: string;
  slug: string;
}>) {
  const trackedIdentity = useRef<string | null>(null);

  useEffect(() => {
    const identity = `${clusterId}:${slug}`;
    if (trackedIdentity.current === identity) return;
    trackedIdentity.current = identity;
    analytics.trackClusterViewed({ clusterId, slug });
  }, [clusterId, slug]);

  return null;
}

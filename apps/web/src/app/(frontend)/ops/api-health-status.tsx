"use client";

import { useGetHealthLive } from "@chinasupply/api-client";
import React from "react";

export type ApiHealthState = "error" | "loading" | "ready";

interface ApiHealthStatusLabels {
  error: string;
  loading: string;
  ready: string;
}

export function ApiHealthStatus({ labels }: { labels: ApiHealthStatusLabels }) {
  const health = useGetHealthLive({
    query: {
      retry: false,
    },
  });
  const state: ApiHealthState = health.isPending
    ? "loading"
    : health.isError
      ? "error"
      : "ready";

  return <ApiHealthStatusView labels={labels} state={state} />;
}

export function ApiHealthStatusView({
  labels,
  state,
}: {
  labels: ApiHealthStatusLabels;
  state: ApiHealthState;
}) {
  return (
    <p
      aria-live="polite"
      className={`api-health api-health--${state}`}
      data-state={state}
    >
      <span aria-hidden="true" className="api-health__dot" />
      {labels[state]}
    </p>
  );
}

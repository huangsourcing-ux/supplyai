import React from "react";

export type MapStatusKind = "data-error" | "loading" | "map-error";

export interface MapStatusLabels {
  dataError: string;
  loading: string;
  mapError: string;
  retry: string;
}

export function MapStatus({
  kind,
  labels,
  onRetry,
}: Readonly<{
  kind: MapStatusKind;
  labels: MapStatusLabels;
  onRetry: () => void;
}>) {
  const isError = kind !== "loading";
  const message =
    kind === "loading"
      ? labels.loading
      : kind === "map-error"
        ? labels.mapError
        : labels.dataError;

  return (
    <div
      aria-live="polite"
      className={`map-status map-status--${isError ? "error" : "loading"}`}
      data-state={kind}
      role={isError ? "alert" : "status"}
    >
      <span aria-hidden="true" className="map-status__indicator" />
      <span>{message}</span>
      {isError ? (
        <button className="map-status__retry" onClick={onRetry} type="button">
          {labels.retry}
        </button>
      ) : null}
    </div>
  );
}

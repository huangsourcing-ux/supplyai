import React from "react";

export function MapTruncationNotice({
  message,
}: Readonly<{ message: string }>) {
  return (
    <div
      aria-live="polite"
      className="map-truncation-notice"
      data-state="truncated"
      role="status"
    >
      {message}
    </div>
  );
}

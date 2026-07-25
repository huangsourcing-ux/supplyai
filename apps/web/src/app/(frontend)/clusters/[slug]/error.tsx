"use client";

import React from "react";

import { ClusterRequestError } from "./cluster-request-error";

export default function ClusterDetailError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <ClusterRequestError error={error} reset={reset} />;
}

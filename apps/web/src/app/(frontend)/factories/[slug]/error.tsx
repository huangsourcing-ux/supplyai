"use client";

import React from "react";

import { FactoryRequestError } from "./factory-request-error";

export default function FactoryDetailError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <FactoryRequestError error={error} reset={reset} />;
}

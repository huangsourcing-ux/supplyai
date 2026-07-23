"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

interface SentrySmokeProps {
  buttonLabel: string;
  environmentLabel: string;
  eventLabel: string;
  flushFailedLabel: string;
  releaseLabel: string;
  sentLabel: string;
}

export function createWebSentrySmokeError(): Error {
  return new Error("M0-T7 Web client Sentry smoke test");
}

export function SentrySmoke({
  buttonLabel,
  environmentLabel,
  eventLabel,
  flushFailedLabel,
  releaseLabel,
  sentLabel,
}: SentrySmokeProps) {
  const [result, setResult] = useState<string>();
  const [isSending, setIsSending] = useState(false);

  async function sendSmokeException() {
    setIsSending(true);

    const eventId = Sentry.captureException(createWebSentrySmokeError(), {
      tags: {
        component: "web-client",
        smoke_test: "m0-t7",
      },
    });
    const flushed = await Sentry.flush(5_000);

    setResult(
      flushed
        ? `${sentLabel} ${eventLabel}: ${eventId}`
        : `${flushFailedLabel} ${eventLabel}: ${eventId}`,
    );
    setIsSending(false);
  }

  return (
    <div>
      <p className="description">
        {environmentLabel}: {process.env.NEXT_PUBLIC_APP_ENV} · {releaseLabel}:{" "}
        {process.env.NEXT_PUBLIC_SENTRY_RELEASE}
      </p>
      <button disabled={isSending} onClick={sendSmokeException} type="button">
        {buttonLabel}
      </button>
      {result ? (
        <p aria-live="polite" className="identifier">
          {result}
        </p>
      ) : null}
    </div>
  );
}

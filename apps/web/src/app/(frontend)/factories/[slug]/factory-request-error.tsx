"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useTransition } from "react";

import styles from "./factory-detail.module.css";
import { retryFactoryPage } from "./factory-retry-action";

export function FactoryRequestError({
  error,
  reset,
}: Readonly<{
  error?: Error & { digest?: string };
  reset?: () => void;
}>) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const translate = useTranslations("FactoryDetail.error");
  const [isRetrying, startTransition] = useTransition();

  useEffect(() => {
    if (error !== undefined) console.error(error);
  }, [error]);

  const retry = () => {
    startTransition(async () => {
      if (reset !== undefined) {
        reset();
        return;
      }

      await retryFactoryPage(slug);
      router.refresh();
    });
  };

  return (
    <main className={styles.statePage}>
      <div className={styles.stateCard}>
        <p className={styles.eyebrow}>{translate("eyebrow")}</p>
        <h1>{translate("title")}</h1>
        <p>{translate("description")}</p>
        <div className={styles.stateActions}>
          <button disabled={isRetrying} onClick={retry} type="button">
            {translate(isRetrying ? "retrying" : "retry")}
          </button>
          <Link href="/">{translate("backToMap")}</Link>
        </div>
      </div>
    </main>
  );
}

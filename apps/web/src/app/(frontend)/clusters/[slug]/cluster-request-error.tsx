"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useTransition } from "react";

import styles from "./cluster-detail.module.css";
import { retryClusterPage } from "./cluster-retry-action";

export function ClusterRequestError({
  error,
  reset,
}: Readonly<{
  error?: Error & { digest?: string };
  reset?: () => void;
}>) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const translate = useTranslations("ClusterDetail.error");
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

      await retryClusterPage(slug);
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

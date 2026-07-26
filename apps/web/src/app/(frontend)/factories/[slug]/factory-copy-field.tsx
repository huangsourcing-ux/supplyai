"use client";

import { useTranslations } from "next-intl";
import React, { useState } from "react";

import { copyTextToClipboard } from "./factory-clipboard";
import styles from "./factory-detail.module.css";

export function FactoryCopyField({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  const translate = useTranslations("FactoryDetail.copy");
  const [status, setStatus] = useState<"copied" | "error" | "idle">("idle");

  const copy = async () => {
    try {
      await copyTextToClipboard(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className={styles.addressRow}>
      <div>
        <p className={styles.addressLabel}>{label}</p>
        <address>{value}</address>
      </div>
      <div className={styles.copyAction}>
        <button
          aria-label={translate("actionLabel", { label })}
          onClick={() => void copy()}
          type="button"
        >
          {translate("action")}
        </button>
        <span aria-live="polite">
          {status === "copied"
            ? translate("success")
            : status === "error"
              ? translate("error")
              : ""}
        </span>
      </div>
    </div>
  );
}

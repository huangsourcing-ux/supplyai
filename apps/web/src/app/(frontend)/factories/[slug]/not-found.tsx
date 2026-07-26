import Link from "next/link";
import { getTranslations } from "next-intl/server";
import React from "react";

import styles from "./factory-detail.module.css";

export default async function FactoryNotFound() {
  const translate = await getTranslations("FactoryDetail.notFound");

  return (
    <main className={styles.statePage}>
      <div className={styles.stateCard}>
        <p className={styles.eyebrow}>{translate("eyebrow")}</p>
        <h1>{translate("title")}</h1>
        <p>{translate("description")}</p>
        <Link className={styles.statePrimaryAction} href="/">
          {translate("backToMap")}
        </Link>
      </div>
    </main>
  );
}

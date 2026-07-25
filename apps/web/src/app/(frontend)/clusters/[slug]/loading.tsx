import { getTranslations } from "next-intl/server";
import React from "react";

import styles from "./cluster-detail.module.css";

export default async function ClusterDetailLoading() {
  const translate = await getTranslations("ClusterDetail.loading");

  return (
    <main
      aria-busy="true"
      aria-label={translate("label")}
      className={styles.page}
    >
      <div className={styles.shell}>
        <div className={`${styles.skeleton} ${styles.skeletonBack}`} />
        <div className={styles.loadingHero}>
          <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
          <div className={`${styles.skeleton} ${styles.skeletonSummary}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.skeletonMap}`} />
        <div className={styles.loadingCards}>
          <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
          <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
          <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        </div>
      </div>
    </main>
  );
}

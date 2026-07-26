import Image from "next/image";
import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";

import type {
  GetCluster200,
  GetClusterFactories200,
} from "@chinasupply/api-client";

import { buildClusterAuthReturnPath } from "@/auth/public-auth-routes";

import {
  FavoriteSaveAction,
  type FavoriteSaveActionLabels,
} from "../../favorites/favorite-save-action";

import { ClusterBoundaryMap } from "./cluster-boundary-map";
import styles from "./cluster-detail.module.css";
import { ClusterFactoryList } from "./cluster-factory-list";
import type { FormattedClusterStats } from "./cluster-stats";
import { ClusterViewTracker } from "./cluster-view-tracker";

export interface ClusterDetailLabels {
  aboutHeading: string;
  annualOutput: string;
  backToMap: string;
  descriptionImageAlt: string;
  exportShare: string;
  factoriesHeading: string;
  factoryCount: string;
  location: string;
  productsHeading: string;
  saveAction: FavoriteSaveActionLabels;
  statsHeading: string;
}

function MarkdownImage({
  alt,
  fallbackAlt,
  src,
}: Readonly<{
  alt?: string;
  fallbackAlt: string;
  src?: string | Blob;
}>) {
  if (typeof src !== "string") return null;

  return (
    <Image
      alt={alt?.trim() === "" || alt === undefined ? fallbackAlt : alt}
      className={styles.markdownImage}
      height={540}
      sizes="(max-width: 76rem) calc(100vw - 3rem), 72rem"
      src={src}
      width={960}
    />
  );
}

export function ClusterDetailContent({
  clusterResponse,
  factoriesResponse,
  formattedFactoryCount,
  formattedStats,
  labels,
}: Readonly<{
  clusterResponse: GetCluster200;
  factoriesResponse: GetClusterFactories200;
  formattedFactoryCount: string;
  formattedStats: FormattedClusterStats;
  labels: ClusterDetailLabels;
}>) {
  const cluster = clusterResponse.data;
  const MarkdownImageWithFallback = ({
    alt,
    src,
  }: Readonly<{ alt?: string; src?: string | Blob }>) => (
    <MarkdownImage
      alt={alt}
      fallbackAlt={labels.descriptionImageAlt}
      src={src}
    />
  );

  return (
    <main className={styles.page}>
      <ClusterViewTracker clusterId={cluster.id} slug={cluster.slug} />
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span>
          {labels.backToMap}
        </Link>

        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{cluster.primaryCategory.name}</p>
            <h1>{cluster.name}</h1>
            <p className={styles.location}>{labels.location}</p>
            <p className={styles.summary}>{cluster.summary}</p>
          </div>
          <FavoriteSaveAction
            labels={labels.saveAction}
            returnPath={buildClusterAuthReturnPath(cluster.slug)}
            targetId={cluster.id}
            targetType="cluster"
          />
        </header>

        <ClusterBoundaryMap
          boundary={cluster.boundary}
          centroid={cluster.centroid}
          color={cluster.primaryCategory.color}
          name={cluster.name}
        />

        <section aria-labelledby="cluster-products" className={styles.section}>
          <p className={styles.sectionEyebrow} id="cluster-products">
            {labels.productsHeading}
          </p>
          <ul className={styles.productList}>
            {cluster.mainProducts.map((product, index) => (
              <li key={`${product}-${index}`}>{product}</li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="cluster-statistics"
          className={styles.section}
        >
          <h2 id="cluster-statistics">{labels.statsHeading}</h2>
          <dl className={styles.statsGrid}>
            <div className={styles.statCard}>
              <dt>{labels.factoryCount}</dt>
              <dd>{formattedFactoryCount}</dd>
            </div>
            {formattedStats.annualOutput === null ? null : (
              <div className={styles.statCard}>
                <dt>{labels.annualOutput}</dt>
                <dd>{formattedStats.annualOutput}</dd>
              </div>
            )}
            {formattedStats.exportShare === null ? null : (
              <div className={styles.statCard}>
                <dt>{labels.exportShare}</dt>
                <dd>{formattedStats.exportShare}</dd>
              </div>
            )}
          </dl>
          {cluster.stats?.note === undefined ? null : (
            <p className={styles.statsNote}>{cluster.stats.note}</p>
          )}
        </section>

        {cluster.description === null ? null : (
          <section aria-labelledby="cluster-about" className={styles.section}>
            <h2 id="cluster-about">{labels.aboutHeading}</h2>
            <div className={styles.markdown}>
              <ReactMarkdown
                components={{ img: MarkdownImageWithFallback }}
                skipHtml
              >
                {cluster.description}
              </ReactMarkdown>
            </div>
          </section>
        )}

        <section
          aria-labelledby="cluster-factories"
          className={styles.factorySection}
        >
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{cluster.region.name}</p>
            <h2 id="cluster-factories">{labels.factoriesHeading}</h2>
          </div>
          <ClusterFactoryList
            initialPage={factoriesResponse}
            slug={cluster.slug}
          />
        </section>
      </div>
    </main>
  );
}

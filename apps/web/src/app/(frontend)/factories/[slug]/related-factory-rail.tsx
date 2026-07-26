import Image from "next/image";
import Link from "next/link";
import React from "react";

import type { GetFactory200DataRelatedFactoriesItem } from "@chinasupply/api-client";

import styles from "./factory-detail.module.css";

export function RelatedFactoryRail({
  factories,
  labels,
}: Readonly<{
  factories: readonly GetFactory200DataRelatedFactoriesItem[];
  labels: Readonly<{
    unverified: string;
    verified: string;
    viewDetails: string;
  }>;
}>) {
  return (
    <ul className={styles.relatedRail}>
      {factories.map((factory) => (
        <li className={styles.relatedCard} key={factory.id}>
          <Link
            aria-label={`${labels.viewDetails}: ${factory.name}`}
            className={styles.relatedCardLink}
            href={`/factories/${factory.slug}`}
          >
            <div className={styles.relatedImage}>
              {factory.imageUrl === null ? (
                <div
                  aria-hidden="true"
                  className={styles.relatedImagePlaceholder}
                >
                  {factory.name.charAt(0)}
                </div>
              ) : (
                <Image
                  alt=""
                  fill
                  sizes="(max-width: 38rem) 78vw, 20rem"
                  src={factory.imageUrl}
                />
              )}
            </div>
            <div className={styles.relatedContent}>
              <div className={styles.relatedHeading}>
                <h3>{factory.name}</h3>
                <span data-verified={String(factory.verified)}>
                  {factory.verified ? labels.verified : labels.unverified}
                </span>
              </div>
              <p>{factory.region.name}</p>
              <ul className={styles.relatedProducts}>
                {factory.mainProducts.map((product, index) => (
                  <li key={`${product}-${index}`}>{product}</li>
                ))}
              </ul>
              <strong>
                {labels.viewDetails}
                <span aria-hidden="true">→</span>
              </strong>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

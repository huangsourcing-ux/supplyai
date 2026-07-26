import Link from "next/link";
import React from "react";

import type { GetFactory200 } from "@chinasupply/api-client";

import { FactoryContactActions } from "./factory-contact-actions";
import { hasFactoryContact } from "./factory-contact";
import styles from "./factory-detail.module.css";
import { FactoryCopyField } from "./factory-copy-field";
import { FactoryImageCarousel } from "./factory-image-carousel";
import { FactoryLocationMap } from "./factory-location-map";
import { FactoryNavigationButtons } from "./factory-navigation-buttons";
import { RelatedFactoryRail } from "./related-factory-rail";

export interface FactoryDetailLabels {
  addressHeading: string;
  backToMap: string;
  certifications: string;
  chineseAddress: string;
  contactHeading: string;
  detailsHeading: string;
  employeeRange: string;
  englishAddress: string;
  establishedYear: string;
  location: string;
  locationHeading: string;
  mainProducts: string;
  moq: string;
  navigationHeading: string;
  related: Readonly<{
    heading: string;
    unverified: string;
    verified: string;
    viewDetails: string;
  }>;
  source: string;
  verificationLabel: string;
}

export function FactoryDetailContent({
  factoryResponse,
  labels,
}: Readonly<{
  factoryResponse: GetFactory200;
  labels: FactoryDetailLabels;
}>) {
  const factory = factoryResponse.data;
  const contact = hasFactoryContact(factory.contact) ? factory.contact : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span>
          {labels.backToMap}
        </Link>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>{labels.location}</p>
          <h1>{factory.name}</h1>
          <div className={styles.trustRow}>
            <span
              className={styles.verificationBadge}
              data-verified={String(factory.verified)}
            >
              {labels.verificationLabel}
            </span>
            {factory.sourceName === null ? null : (
              <p className={styles.source}>
                <span>{labels.source}</span>
                {factory.sourceUrl === null ? (
                  <strong>{factory.sourceName}</strong>
                ) : (
                  <a href={factory.sourceUrl} rel="noreferrer" target="_blank">
                    {factory.sourceName}
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </p>
            )}
          </div>
        </header>

        {factory.images.length === 0 ? null : (
          <FactoryImageCarousel images={factory.images} name={factory.name} />
        )}

        <section aria-labelledby="factory-details" className={styles.section}>
          <h2 id="factory-details">{labels.detailsHeading}</h2>
          <dl className={styles.detailsGrid}>
            <div className={styles.detailCard}>
              <dt>{labels.mainProducts}</dt>
              <dd>
                <ul className={styles.productList}>
                  {factory.mainProducts.map((product, index) => (
                    <li key={`${product}-${index}`}>{product}</li>
                  ))}
                </ul>
              </dd>
            </div>
            {factory.certifications.length === 0 ? null : (
              <div className={styles.detailCard}>
                <dt>{labels.certifications}</dt>
                <dd>{factory.certifications.join(", ")}</dd>
              </div>
            )}
            {factory.moq === null ? null : (
              <div className={styles.detailCard}>
                <dt>{labels.moq}</dt>
                <dd>{factory.moq}</dd>
              </div>
            )}
            {factory.establishedYear === null ? null : (
              <div className={styles.detailCard}>
                <dt>{labels.establishedYear}</dt>
                <dd>{factory.establishedYear}</dd>
              </div>
            )}
            {factory.employeeRange === null ? null : (
              <div className={styles.detailCard}>
                <dt>{labels.employeeRange}</dt>
                <dd>{factory.employeeRange}</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby="factory-location" className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{labels.location}</p>
            <h2 id="factory-location">{labels.locationHeading}</h2>
          </div>
          <FactoryLocationMap
            location={factory.location}
            name={factory.name}
            verified={factory.verified}
          />
        </section>

        <section aria-labelledby="factory-address" className={styles.section}>
          <h2 id="factory-address">{labels.addressHeading}</h2>
          <div className={styles.addressList}>
            <FactoryCopyField
              label={labels.englishAddress}
              value={factory.address.en}
            />
            <FactoryCopyField
              label={labels.chineseAddress}
              value={factory.address.zh}
            />
          </div>
        </section>

        {contact === null ? null : (
          <section aria-labelledby="factory-contact" className={styles.section}>
            <h2 id="factory-contact">{labels.contactHeading}</h2>
            <FactoryContactActions
              contact={contact}
              factoryId={factory.id}
              slug={factory.slug}
            />
          </section>
        )}

        <section
          aria-labelledby="factory-navigation"
          className={styles.section}
        >
          <h2 id="factory-navigation">{labels.navigationHeading}</h2>
          <FactoryNavigationButtons
            factoryId={factory.id}
            name={factory.name}
            position={factory.location.coordinates}
            slug={factory.slug}
          />
        </section>

        {factory.relatedFactories.length === 0 ? null : (
          <section
            aria-labelledby="related-factories"
            className={styles.relatedSection}
          >
            <h2 id="related-factories">{labels.related.heading}</h2>
            <RelatedFactoryRail
              factories={factory.relatedFactories}
              labels={labels.related}
            />
          </section>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import React from "react";

import styles from "./legal-page.module.css";

const COMPANY_RECORD_URL =
  "https://find-and-update.company-information.service.gov.uk/company/17241958";

export interface LegalSection {
  id: string;
  items?: ReactNode[];
  paragraphs: ReactNode[];
  title: string;
}

export interface LegalPageLabels {
  backToMap: string;
  companyAddress: string;
  companyHeading: string;
  companyName: string;
  companyNumber: string;
  companyNumberLabel: string;
  companyRecord: string;
  companyRegistration: string;
  contactEmail: string;
  contactEmailLabel: string;
  effectiveDate: string;
  eyebrow: string;
  introduction: string;
  lastUpdated: string;
  onThisPage: string;
  relatedLabel: string;
  relatedText: string;
  title: string;
}

export function LegalPage({
  labels,
  relatedHref,
  sections,
}: Readonly<{
  labels: LegalPageLabels;
  relatedHref: string;
  sections: LegalSection[];
}>) {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <header className={styles.header}>
          <Link className={styles.back} href="/">
            {labels.backToMap}
          </Link>
          <p className={styles.eyebrow}>{labels.eyebrow}</p>
          <h1 className={styles.title}>{labels.title}</h1>
          <p className={styles.introduction}>{labels.introduction}</p>
          <p className={styles.updated}>
            {labels.lastUpdated}{" "}
            <time dateTime="2026-07-26">{labels.effectiveDate}</time>
          </p>
        </header>

        <nav aria-label={labels.onThisPage} className={styles.contents}>
          <h2>{labels.onThisPage}</h2>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.sections}>
          {sections.map((section) => (
            <section
              className={styles.section}
              id={section.id}
              key={section.id}
            >
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={`${section.id}-paragraph-${index}`}>{paragraph}</p>
              ))}
              {section.items === undefined ? null : (
                <ul>
                  {section.items.map((item, index) => (
                    <li key={`${section.id}-item-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside aria-labelledby="company-details" className={styles.company}>
          <h2 id="company-details">{labels.companyHeading}</h2>
          <address>
            <strong>{labels.companyName}</strong>
            <span>
              {labels.companyNumberLabel}: {labels.companyNumber}
            </span>
            <span>{labels.companyRegistration}</span>
            <span>{labels.companyAddress}</span>
            <span>
              {labels.contactEmailLabel}:{" "}
              <a href={`mailto:${labels.contactEmail}`}>
                {labels.contactEmail}
              </a>
            </span>
          </address>
          <a href={COMPANY_RECORD_URL} rel="noreferrer" target="_blank">
            {labels.companyRecord}
          </a>
        </aside>

        <footer className={styles.footer}>
          <span>{labels.relatedText}</span>{" "}
          <Link href={relatedHref}>{labels.relatedLabel}</Link>
        </footer>
      </article>
    </main>
  );
}

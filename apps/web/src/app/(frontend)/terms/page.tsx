import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import React from "react";

import { PUBLIC_PRIVACY_PATH } from "@/legal/legal-routes";
import { buildPublicPageMetadata } from "@/seo/metadata";

import {
  LegalPage,
  type LegalPageLabels,
  type LegalSection,
} from "../legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Legal.terms.metadata");

  return buildPublicPageMetadata({
    description: translate("description"),
    path: "/terms",
    title: translate("title"),
  });
}

export default async function TermsPage() {
  const translate = await getTranslations("Legal");
  const sections: LegalSection[] = [
    {
      id: "agreement-and-operator",
      paragraphs: [
        translate("terms.sections.agreement.paragraph1"),
        translate("terms.sections.agreement.paragraph2"),
      ],
      title: translate("terms.sections.agreement.title"),
    },
    {
      id: "eligibility-and-accounts",
      items: [
        translate("terms.sections.accounts.items.accurate"),
        translate("terms.sections.accounts.items.security"),
        translate("terms.sections.accounts.items.responsibility"),
      ],
      paragraphs: [
        translate("terms.sections.accounts.paragraph1"),
        translate("terms.sections.accounts.paragraph2"),
      ],
      title: translate("terms.sections.accounts.title"),
    },
    {
      id: "directory-only",
      paragraphs: [
        translate("terms.sections.directory.paragraph1"),
        translate("terms.sections.directory.paragraph2"),
      ],
      title: translate("terms.sections.directory.title"),
    },
    {
      id: "verified-status",
      paragraphs: [
        translate("terms.sections.verified.paragraph1"),
        translate("terms.sections.verified.paragraph2"),
      ],
      title: translate("terms.sections.verified.title"),
    },
    {
      id: "your-sourcing-decisions",
      items: [
        translate("terms.sections.decisions.items.identity"),
        translate("terms.sections.decisions.items.contract"),
        translate("terms.sections.decisions.items.compliance"),
        translate("terms.sections.decisions.items.payment"),
      ],
      paragraphs: [translate("terms.sections.decisions.paragraph1")],
      title: translate("terms.sections.decisions.title"),
    },
    {
      id: "acceptable-use",
      items: [
        translate("terms.sections.use.items.unlawful"),
        translate("terms.sections.use.items.impersonation"),
        translate("terms.sections.use.items.security"),
        translate("terms.sections.use.items.scraping"),
        translate("terms.sections.use.items.republish"),
      ],
      paragraphs: [translate("terms.sections.use.paragraph1")],
      title: translate("terms.sections.use.title"),
    },
    {
      id: "third-party-services",
      paragraphs: [
        translate("terms.sections.thirdParty.paragraph1"),
        translate("terms.sections.thirdParty.paragraph2"),
      ],
      title: translate("terms.sections.thirdParty.title"),
    },
    {
      id: "intellectual-property",
      paragraphs: [
        translate("terms.sections.intellectualProperty.paragraph1"),
        translate("terms.sections.intellectualProperty.paragraph2"),
      ],
      title: translate("terms.sections.intellectualProperty.title"),
    },
    {
      id: "availability-and-changes",
      paragraphs: [
        translate("terms.sections.availability.paragraph1"),
        translate("terms.sections.availability.paragraph2"),
      ],
      title: translate("terms.sections.availability.title"),
    },
    {
      id: "suspension-and-termination",
      paragraphs: [
        translate("terms.sections.termination.paragraph1"),
        translate("terms.sections.termination.paragraph2"),
      ],
      title: translate("terms.sections.termination.title"),
    },
    {
      id: "disclaimers",
      paragraphs: [
        translate("terms.sections.disclaimers.paragraph1"),
        translate("terms.sections.disclaimers.paragraph2"),
      ],
      title: translate("terms.sections.disclaimers.title"),
    },
    {
      id: "limitation-of-liability",
      paragraphs: [
        translate("terms.sections.liability.paragraph1"),
        translate("terms.sections.liability.paragraph2"),
        translate("terms.sections.liability.paragraph3"),
      ],
      title: translate("terms.sections.liability.title"),
    },
    {
      id: "separate-paid-services",
      paragraphs: [translate("terms.sections.paid.paragraph1")],
      title: translate("terms.sections.paid.title"),
    },
    {
      id: "privacy",
      paragraphs: [
        translate.rich("terms.sections.privacy.paragraph1", {
          privacy: (chunks) => <Link href={PUBLIC_PRIVACY_PATH}>{chunks}</Link>,
        }),
      ],
      title: translate("terms.sections.privacy.title"),
    },
    {
      id: "governing-law",
      paragraphs: [
        translate("terms.sections.law.paragraph1"),
        translate("terms.sections.law.paragraph2"),
      ],
      title: translate("terms.sections.law.title"),
    },
    {
      id: "changes-and-contact",
      paragraphs: [
        translate("terms.sections.changes.paragraph1"),
        translate("terms.sections.changes.paragraph2"),
      ],
      title: translate("terms.sections.changes.title"),
    },
  ];
  const labels: LegalPageLabels = {
    backToMap: translate("shared.backToMap"),
    companyAddress: translate("shared.company.address"),
    companyHeading: translate("shared.company.heading"),
    companyName: translate("shared.company.name"),
    companyNumber: translate("shared.company.number"),
    companyNumberLabel: translate("shared.company.numberLabel"),
    companyRecord: translate("shared.company.record"),
    companyRegistration: translate("shared.company.registration"),
    contactEmail: translate("shared.company.email"),
    contactEmailLabel: translate("shared.company.emailLabel"),
    effectiveDate: translate("shared.effectiveDate"),
    eyebrow: translate("terms.eyebrow"),
    introduction: translate("terms.introduction"),
    lastUpdated: translate("shared.lastUpdated"),
    onThisPage: translate("shared.onThisPage"),
    relatedLabel: translate("terms.related.label"),
    relatedText: translate("terms.related.text"),
    title: translate("terms.title"),
  };

  return (
    <LegalPage
      labels={labels}
      relatedHref={PUBLIC_PRIVACY_PATH}
      sections={sections}
    />
  );
}

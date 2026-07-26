import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import React from "react";

import { PUBLIC_TERMS_PATH } from "@/legal/legal-routes";

import {
  LegalPage,
  type LegalPageLabels,
  type LegalSection,
} from "../legal/legal-page";

const ICO_COMPLAINT_URL =
  "https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Legal.privacy.metadata");

  return {
    description: translate("description"),
    title: translate("title"),
  };
}

export default async function PrivacyPage() {
  const translate = await getTranslations("Legal");
  const sections: LegalSection[] = [
    {
      id: "controller-and-scope",
      paragraphs: [
        translate("privacy.sections.controller.paragraph1"),
        translate("privacy.sections.controller.paragraph2"),
      ],
      title: translate("privacy.sections.controller.title"),
    },
    {
      id: "information-we-process",
      items: [
        translate("privacy.sections.information.items.account"),
        translate("privacy.sections.information.items.favorites"),
        translate("privacy.sections.information.items.usage"),
        translate("privacy.sections.information.items.technical"),
        translate("privacy.sections.information.items.analytics"),
        translate("privacy.sections.information.items.communications"),
        translate("privacy.sections.information.items.directory"),
      ],
      paragraphs: [translate("privacy.sections.information.paragraph1")],
      title: translate("privacy.sections.information.title"),
    },
    {
      id: "where-information-comes-from",
      items: [
        translate("privacy.sections.sources.items.you"),
        translate("privacy.sections.sources.items.automatic"),
        translate("privacy.sections.sources.items.providers"),
        translate("privacy.sections.sources.items.public"),
      ],
      paragraphs: [translate("privacy.sections.sources.paragraph1")],
      title: translate("privacy.sections.sources.title"),
    },
    {
      id: "how-we-use-information",
      items: [
        translate("privacy.sections.uses.items.deliver"),
        translate("privacy.sections.uses.items.accounts"),
        translate("privacy.sections.uses.items.security"),
        translate("privacy.sections.uses.items.improve"),
        translate("privacy.sections.uses.items.communicate"),
        translate("privacy.sections.uses.items.directory"),
        translate("privacy.sections.uses.items.legal"),
      ],
      paragraphs: [translate("privacy.sections.uses.paragraph1")],
      title: translate("privacy.sections.uses.title"),
    },
    {
      id: "lawful-bases",
      items: [
        translate("privacy.sections.bases.items.contract"),
        translate("privacy.sections.bases.items.interests"),
        translate("privacy.sections.bases.items.consent"),
        translate("privacy.sections.bases.items.obligation"),
      ],
      paragraphs: [translate("privacy.sections.bases.paragraph1")],
      title: translate("privacy.sections.bases.title"),
    },
    {
      id: "cookies-storage-and-analytics",
      items: [
        translate("privacy.sections.analytics.items.essential"),
        translate("privacy.sections.analytics.items.preference"),
        translate("privacy.sections.analytics.items.posthog"),
      ],
      paragraphs: [
        translate("privacy.sections.analytics.paragraph1"),
        translate("privacy.sections.analytics.paragraph2"),
      ],
      title: translate("privacy.sections.analytics.title"),
    },
    {
      id: "sharing-and-service-providers",
      items: [
        translate("privacy.sections.sharing.items.clerk"),
        translate("privacy.sections.sharing.items.hosting"),
        translate("privacy.sections.sharing.items.maps"),
        translate("privacy.sections.sharing.items.monitoring"),
        translate("privacy.sections.sharing.items.email"),
        translate("privacy.sections.sharing.items.authorities"),
      ],
      paragraphs: [
        translate("privacy.sections.sharing.paragraph1"),
        translate("privacy.sections.sharing.paragraph2"),
      ],
      title: translate("privacy.sections.sharing.title"),
    },
    {
      id: "international-transfers",
      paragraphs: [
        translate("privacy.sections.transfers.paragraph1"),
        translate("privacy.sections.transfers.paragraph2"),
      ],
      title: translate("privacy.sections.transfers.title"),
    },
    {
      id: "retention-and-account-deletion",
      items: [
        translate("privacy.sections.retention.items.account"),
        translate("privacy.sections.retention.items.favorites"),
        translate("privacy.sections.retention.items.deleted"),
        translate("privacy.sections.retention.items.operational"),
        translate("privacy.sections.retention.items.consent"),
      ],
      paragraphs: [translate("privacy.sections.retention.paragraph1")],
      title: translate("privacy.sections.retention.title"),
    },
    {
      id: "business-directory-information",
      paragraphs: [
        translate("privacy.sections.directory.paragraph1"),
        translate("privacy.sections.directory.paragraph2"),
      ],
      title: translate("privacy.sections.directory.title"),
    },
    {
      id: "your-rights-and-choices",
      items: [
        translate("privacy.sections.rights.items.access"),
        translate("privacy.sections.rights.items.correct"),
        translate("privacy.sections.rights.items.delete"),
        translate("privacy.sections.rights.items.restrict"),
        translate("privacy.sections.rights.items.portability"),
        translate("privacy.sections.rights.items.withdraw"),
        translate("privacy.sections.rights.items.complain"),
      ],
      paragraphs: [
        translate("privacy.sections.rights.paragraph1"),
        translate("privacy.sections.rights.paragraph2"),
        translate.rich("privacy.sections.rights.paragraph3", {
          ico: (chunks) => (
            <a href={ICO_COMPLAINT_URL} rel="noreferrer" target="_blank">
              {chunks}
            </a>
          ),
        }),
      ],
      title: translate("privacy.sections.rights.title"),
    },
    {
      id: "automated-decisions-and-sales",
      paragraphs: [
        translate("privacy.sections.automated.paragraph1"),
        translate("privacy.sections.automated.paragraph2"),
      ],
      title: translate("privacy.sections.automated.title"),
    },
    {
      id: "children",
      paragraphs: [translate("privacy.sections.children.paragraph1")],
      title: translate("privacy.sections.children.title"),
    },
    {
      id: "security",
      paragraphs: [
        translate("privacy.sections.security.paragraph1"),
        translate("privacy.sections.security.paragraph2"),
      ],
      title: translate("privacy.sections.security.title"),
    },
    {
      id: "external-services",
      paragraphs: [translate("privacy.sections.external.paragraph1")],
      title: translate("privacy.sections.external.title"),
    },
    {
      id: "changes-and-contact",
      paragraphs: [
        translate("privacy.sections.changes.paragraph1"),
        translate("privacy.sections.changes.paragraph2"),
      ],
      title: translate("privacy.sections.changes.title"),
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
    eyebrow: translate("privacy.eyebrow"),
    introduction: translate("privacy.introduction"),
    lastUpdated: translate("shared.lastUpdated"),
    onThisPage: translate("shared.onThisPage"),
    relatedLabel: translate("privacy.related.label"),
    relatedText: translate("privacy.related.text"),
    title: translate("privacy.title"),
  };

  return (
    <LegalPage
      labels={labels}
      relatedHref={PUBLIC_TERMS_PATH}
      sections={sections}
    />
  );
}

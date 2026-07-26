import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import React from "react";

import { getFactoryPageData } from "./factory-data";
import { FactoryDetailContent } from "./factory-detail-content";
import { formatVerificationMonth } from "./factory-formatters";
import { buildFactoryMetadata } from "./factory-metadata";
import { FactoryRequestError } from "./factory-request-error";

export const revalidate = 900;

interface FactoryPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): [] {
  return [];
}

export async function generateMetadata({
  params,
}: FactoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const translatePromise = getTranslations("FactoryDetail.metadata");
  let factoryResponse: Awaited<ReturnType<typeof getFactoryPageData>>;

  try {
    factoryResponse = await getFactoryPageData(slug);
  } catch {
    const translate = await translatePromise;

    return {
      robots: {
        follow: false,
        index: false,
      },
      title: translate("unavailableTitle"),
    };
  }

  if (factoryResponse === null) notFound();
  const translate = await translatePromise;
  const factory = factoryResponse.data;

  return buildFactoryMetadata(factory, {
    description: translate("description", {
      city: factory.region.name,
      name: factory.name,
      products: factory.mainProducts.slice(0, 3).join(", "),
    }),
    imageAlt: translate("imageAlt", { name: factory.name }),
    title: translate("title", {
      city: factory.region.name,
      name: factory.name,
    }),
  });
}

export default async function FactoryPage({ params }: FactoryPageProps) {
  const { slug } = await params;
  const translatePromise = getTranslations("FactoryDetail");
  let factoryResponse: Awaited<ReturnType<typeof getFactoryPageData>>;

  try {
    factoryResponse = await getFactoryPageData(slug);
  } catch {
    return <FactoryRequestError />;
  }

  if (factoryResponse === null) notFound();

  const translate = await translatePromise;
  const factory = factoryResponse.data;
  const verifiedMonth = formatVerificationMonth(factory.lastVerifiedAt);
  const verificationLabel = factory.verified
    ? verifiedMonth === null
      ? translate("trust.verified")
      : translate("trust.verifiedMonth", { month: verifiedMonth })
    : translate("trust.unverified");

  return (
    <FactoryDetailContent
      factoryResponse={factoryResponse}
      labels={{
        addressHeading: translate("address.heading"),
        backToMap: translate("backToMap"),
        certifications: translate("details.certifications"),
        chineseAddress: translate("address.chinese"),
        contactHeading: translate("contact.heading"),
        detailsHeading: translate("details.heading"),
        employeeRange: translate("details.employeeRange"),
        englishAddress: translate("address.english"),
        establishedYear: translate("details.establishedYear"),
        location: translate("location", { city: factory.region.name }),
        locationHeading: translate("map.heading"),
        mainProducts: translate("details.mainProducts"),
        moq: translate("details.moq"),
        navigationHeading: translate("navigation.heading"),
        related: {
          heading: translate("related.heading"),
          unverified: translate("related.unverified"),
          verified: translate("related.verified"),
          viewDetails: translate("related.viewDetails"),
        },
        saveAction: {
          checking: translate("saveAction.checking"),
          error: translate("saveAction.error"),
          retry: translate("saveAction.retry"),
          save: translate("saveAction.save"),
          saved: translate("saveAction.saved"),
          saving: translate("saveAction.saving"),
          signInHint: translate("saveAction.signInHint"),
        },
        source: translate("trust.source"),
        verificationLabel,
      }}
    />
  );
}

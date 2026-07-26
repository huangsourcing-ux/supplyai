import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import React from "react";

import { ClusterDetailContent } from "./cluster-detail-content";
import { getClusterFactoryFirstPage, getClusterPageData } from "./cluster-data";
import { buildClusterMetadata } from "./cluster-metadata";
import { ClusterRequestError } from "./cluster-request-error";
import { formatClusterFactoryCount, formatClusterStats } from "./cluster-stats";

export const revalidate = 900;

interface ClusterPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): [] {
  return [];
}

export async function generateMetadata({
  params,
}: ClusterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const translatePromise = getTranslations("ClusterDetail.metadata");
  let clusterResponse: Awaited<ReturnType<typeof getClusterPageData>>;

  try {
    clusterResponse = await getClusterPageData(slug);
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

  if (clusterResponse === null) notFound();
  const translate = await translatePromise;
  return buildClusterMetadata(clusterResponse.data, {
    imageAlt: translate("imageAlt", { name: clusterResponse.data.name }),
    title: translate("title", {
      city: clusterResponse.data.region.name,
      name: clusterResponse.data.name,
    }),
  });
}

export default async function ClusterPage({ params }: ClusterPageProps) {
  const { slug } = await params;
  const localePromise = getLocale();
  const translatePromise = getTranslations("ClusterDetail");
  let clusterResponse: Awaited<ReturnType<typeof getClusterPageData>>;
  let factoriesResponse: Awaited<ReturnType<typeof getClusterFactoryFirstPage>>;

  try {
    [clusterResponse, factoriesResponse] = await Promise.all([
      getClusterPageData(slug),
      getClusterFactoryFirstPage(slug),
    ]);
  } catch {
    return <ClusterRequestError />;
  }

  if (clusterResponse === null || factoriesResponse === null) notFound();

  const [locale, translate] = await Promise.all([
    localePromise,
    translatePromise,
  ]);
  const cluster = clusterResponse.data;

  return (
    <ClusterDetailContent
      clusterResponse={clusterResponse}
      factoriesResponse={factoriesResponse}
      formattedFactoryCount={formatClusterFactoryCount(
        cluster.factoryCount,
        locale,
      )}
      formattedStats={formatClusterStats(cluster.stats, locale)}
      labels={{
        aboutHeading: translate("aboutHeading"),
        annualOutput: translate("stats.annualOutput"),
        backToMap: translate("backToMap"),
        descriptionImageAlt: translate("descriptionImageAlt", {
          name: cluster.name,
        }),
        exportShare: translate("stats.exportShare"),
        factoriesHeading: translate("factories.heading"),
        factoryCount: translate("stats.factoryCount"),
        location: translate("location", { city: cluster.region.name }),
        productsHeading: translate("productsHeading"),
        saveAction: {
          loading: translate("saveAction.loading"),
          pending: translate("saveAction.pending"),
          save: translate("saveAction.save"),
          signInHint: translate("saveAction.signInHint"),
        },
        statsHeading: translate("stats.heading"),
      }}
    />
  );
}

import type { Metadata } from "next";

import type { GetCluster200Data } from "@chinasupply/api-client";

export function buildClusterMetadata(
  cluster: GetCluster200Data,
  labels: Readonly<{
    imageAlt: string;
    title: string;
  }>,
): Metadata {
  const canonicalPath = `/clusters/${cluster.slug}`;

  return {
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: canonicalPath,
      },
    },
    description: cluster.summary,
    openGraph: {
      description: cluster.summary,
      locale: "en_US",
      siteName: "ChinaSupply.AI",
      title: labels.title,
      type: "website",
      url: canonicalPath,
      ...(cluster.coverImageUrl === null
        ? {}
        : {
            images: [
              {
                alt: labels.imageAlt,
                url: cluster.coverImageUrl,
              },
            ],
          }),
    },
    title: labels.title,
  };
}

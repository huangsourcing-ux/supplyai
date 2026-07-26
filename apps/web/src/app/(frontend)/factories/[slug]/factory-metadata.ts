import type { Metadata } from "next";

import type { GetFactory200Data } from "@chinasupply/api-client";

export function buildFactoryMetadata(
  factory: GetFactory200Data,
  labels: Readonly<{
    description: string;
    imageAlt: string;
    title: string;
  }>,
): Metadata {
  const canonicalPath = `/factories/${factory.slug}`;

  return {
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: canonicalPath,
      },
    },
    description: labels.description,
    openGraph: {
      description: labels.description,
      locale: "en_US",
      siteName: "ChinaSupply.AI",
      title: labels.title,
      type: "website",
      url: canonicalPath,
      ...(factory.imageUrl === null
        ? {}
        : {
            images: [
              {
                alt: labels.imageAlt,
                url: factory.imageUrl,
              },
            ],
          }),
    },
    title: labels.title,
  };
}

import type { Metadata } from "next";

export function buildPublicPageMetadata({
  description,
  path,
  title,
}: Readonly<{
  description: string;
  path: string;
  title: string;
}>): Metadata {
  return {
    alternates: {
      canonical: path,
      languages: {
        en: path,
      },
    },
    description,
    openGraph: {
      description,
      locale: "en_US",
      siteName: "ChinaSupply.AI",
      title,
      type: "website",
      url: path,
    },
    title,
  };
}

import {
  type FactoryContact,
  type FactoryImage,
  type LocalizedText,
  publicFactoryDetailSchema,
  publicFactorySummarySchema,
} from "@chinasupply/schemas";
import type { z } from "zod";

import {
  toPublicCategorySummary,
  type CategoryRow,
} from "../categories/category.mapper.js";
import type { Wgs84Point } from "../database/postgis.js";
import type { PublicMediaUrlService } from "../media/public-media-url.service.js";

export interface PublicFactoryRow {
  clusterId: string | null;
  clusterName: LocalizedText | null;
  clusterSlug: string | null;
  id: string;
  images: FactoryImage[];
  location: Wgs84Point;
  mainProducts: LocalizedText[];
  name: LocalizedText;
  publishedAt: Date | null;
  regionId: string;
  regionLevel: "city" | "county" | "province";
  regionName: LocalizedText;
  slug: string;
  verified: boolean;
}

export interface PublicFactoryDetailRow extends PublicFactoryRow {
  address: LocalizedText;
  certifications: string[];
  contact: FactoryContact | null;
  employeeRange: string | null;
  establishedYear: number | null;
  factoryClusterId: string | null;
  lastVerifiedAt: Date | null;
  moq: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  verifiedAt: Date | null;
}

export type PublicFactorySummary = z.output<typeof publicFactorySummarySchema>;
export type PublicFactoryDetail = z.output<typeof publicFactoryDetailSchema>;

function resolveRequiredMediaUrl(
  mediaUrls: PublicMediaUrlService,
  objectKey: string,
): string {
  const url = mediaUrls.resolve(objectKey);

  if (url === null) {
    throw new Error("Factory image objectKey did not resolve to a public URL");
  }

  return url;
}

export function toPublicFactorySummary(
  row: PublicFactoryRow,
  mediaUrls: PublicMediaUrlService,
): PublicFactorySummary {
  if (row.publishedAt === null) {
    throw new Error("Published factory is missing publishedAt");
  }

  const firstImage = row.images[0];

  return publicFactorySummarySchema.parse({
    cluster:
      row.clusterId === null ||
      row.clusterName === null ||
      row.clusterSlug === null
        ? null
        : {
            id: row.clusterId,
            name: row.clusterName.en,
            slug: row.clusterSlug,
          },
    id: row.id,
    imageUrl:
      firstImage === undefined
        ? null
        : resolveRequiredMediaUrl(mediaUrls, firstImage.objectKey),
    location: {
      coordinates: [...row.location],
      type: "Point",
    },
    mainProducts: row.mainProducts.map((product) => product.en),
    name: row.name.en,
    publishedAt: row.publishedAt.toISOString(),
    region: {
      id: row.regionId,
      level: row.regionLevel,
      name: row.regionName.en,
    },
    slug: row.slug,
    verified: row.verified,
  });
}

export function toPublicFactoryDetail(
  row: PublicFactoryDetailRow,
  categoryRows: readonly CategoryRow[],
  relatedRows: readonly PublicFactoryRow[],
  mediaUrls: PublicMediaUrlService,
): PublicFactoryDetail {
  return publicFactoryDetailSchema.parse({
    ...toPublicFactorySummary(row, mediaUrls),
    address: row.address,
    categories: categoryRows.map(toPublicCategorySummary),
    certifications: row.certifications,
    contact: row.contact,
    employeeRange: row.employeeRange,
    establishedYear: row.establishedYear,
    images: row.images.map((image) => ({
      alt: image.alt.en,
      url: resolveRequiredMediaUrl(mediaUrls, image.objectKey),
    })),
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    moq: row.moq,
    relatedFactories: relatedRows.map((related) =>
      toPublicFactorySummary(related, mediaUrls),
    ),
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
  });
}

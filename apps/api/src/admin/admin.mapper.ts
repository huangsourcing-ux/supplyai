import {
  adminClusterListItemSchema,
  adminClusterSchema,
  adminFactoryListItemSchema,
  adminFactorySchema,
  type ClusterStats,
  type FactoryContact,
  type FactoryImage,
  type GeoJsonMultiPolygon,
  type LocalizedText,
} from "@chinasupply/schemas";
import type { z } from "zod";

import type { Wgs84Point } from "../database/postgis.js";
import type { PublicMediaUrlService } from "../media/public-media-url.service.js";

export interface AdminClusterListRow {
  factoryCount: number;
  id: string;
  name: LocalizedText;
  publishedAt: Date | null;
  slug: string;
  status: "draft" | "published";
  updatedAt: Date;
}

export interface AdminClusterRow {
  boundary: GeoJsonMultiPolygon | null;
  coverImage: string | null;
  createdAt: Date;
  description: LocalizedText | null;
  id: string;
  mainProducts: LocalizedText[];
  name: LocalizedText;
  primaryCategoryId: string;
  publishedAt: Date | null;
  regionId: string;
  slug: string;
  stats: ClusterStats | null;
  status: "draft" | "published";
  summary: LocalizedText;
  updatedAt: Date;
  centroid: Wgs84Point;
}

export interface AdminFactoryListRow {
  id: string;
  name: LocalizedText;
  publishedAt: Date | null;
  slug: string;
  status: "draft" | "published";
  updatedAt: Date;
  verified: boolean;
}

export interface AdminFactoryRow {
  address: LocalizedText;
  certifications: string[];
  clusterId: string | null;
  contact: FactoryContact | null;
  createdAt: Date;
  employeeRange: string | null;
  establishedYear: number | null;
  id: string;
  images: FactoryImage[];
  lastVerifiedAt: Date | null;
  location: Wgs84Point;
  mainProducts: LocalizedText[];
  moq: string | null;
  name: LocalizedText;
  publishedAt: Date | null;
  regionId: string;
  slug: string;
  sourceName: string | null;
  sourceUrl: string | null;
  status: "draft" | "published";
  updatedAt: Date;
  verified: boolean;
  verifiedAt: Date | null;
  verifiedBy: string | null;
}

export type AdminClusterListItem = z.output<typeof adminClusterListItemSchema>;
export type AdminFactoryListItem = z.output<typeof adminFactoryListItemSchema>;
export type AdminCluster = z.output<typeof adminClusterSchema>;
export type AdminFactory = z.output<typeof adminFactorySchema>;

export function toAdminClusterListItem(
  row: AdminClusterListRow,
): AdminClusterListItem {
  return adminClusterListItemSchema.parse({
    ...row,
    factoryCount: Number(row.factoryCount),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function toAdminFactoryListItem(
  row: AdminFactoryListRow,
): AdminFactoryListItem {
  return adminFactoryListItemSchema.parse({
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  });
}

function resolveAdminMedia(
  objectKey: string | null,
  mediaUrls: PublicMediaUrlService,
): { objectKey: string; url: string } | null {
  if (objectKey === null) {
    return null;
  }

  const url = mediaUrls.resolve(objectKey);
  if (url === null) {
    throw new Error("Admin media objectKey did not resolve to a public URL");
  }

  return { objectKey, url };
}

export function toAdminCluster(
  row: AdminClusterRow,
  categoryIds: readonly string[],
  mediaUrls: PublicMediaUrlService,
): AdminCluster {
  return adminClusterSchema.parse({
    ...row,
    boundary: row.boundary,
    categoryIds,
    centroid: {
      coordinates: [...row.centroid],
      type: "Point",
    },
    coverImage: resolveAdminMedia(row.coverImage, mediaUrls),
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function toAdminFactory(
  row: AdminFactoryRow,
  categoryIds: readonly string[],
  mediaUrls: PublicMediaUrlService,
): AdminFactory {
  return adminFactorySchema.parse({
    ...row,
    categoryIds,
    createdAt: row.createdAt.toISOString(),
    images: row.images.map((image) => {
      const media = resolveAdminMedia(image.objectKey, mediaUrls);
      if (media === null) {
        throw new Error("Factory image objectKey is required");
      }
      return { ...media, alt: image.alt };
    }),
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    location: {
      coordinates: [...row.location],
      type: "Point",
    },
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
  });
}

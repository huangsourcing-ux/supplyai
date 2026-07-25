import type {
  GetAdminCluster200Data,
  GetAdminClusters200DataItem,
  GetAdminFactories200DataItem,
  GetAdminFactory200Data,
} from "@chinasupply/api-client";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ClusterEditor,
  FactoryEditor,
  OpsEntityLists,
  type OpsLabels,
} from "../app/(frontend)/ops/ops-dashboard";
import {
  buildClusterUpdate,
  buildFactoryUpdate,
  parseIdList,
  parseProducts,
} from "../app/(frontend)/ops/ops-form-data";

const clusterId = "clu_12345678901234567";
const factoryId = "fac_12345678901234567";
const regionId = "reg_12345678901234567";
const categoryId = "cat_12345678901234567";
const timestamp = "2026-07-24T12:00:00Z";

const labels: OpsLabels = {
  actionError: "The operation could not be completed.",
  authError: "The administrator session could not be authorized.",
  clusterCount: (count) => `${count} clusters`,
  clusterList: "Industrial clusters",
  emptyList: "No records found.",
  factoryCount: (count) => `${count} factories`,
  factoryList: "Factories",
  fields: {
    addressEn: "Address (English)",
    addressZh: "Address (Chinese)",
    boundary: "Boundary GeoJSON (MultiPolygon)",
    categories: "Category IDs",
    certifications: "Certifications",
    clusterId: "Industrial cluster ID",
    contactEmail: "Contact email",
    contactPhone: "Contact phone",
    contactWechat: "Contact WeChat",
    contactWebsite: "Official website",
    descriptionEn: "Description (English)",
    descriptionZh: "Description (Chinese)",
    employeeRange: "Employee range",
    establishedYear: "Established year",
    latitude: "WGS-84 latitude",
    longitude: "WGS-84 longitude",
    mainProducts: "Main products",
    moq: "Minimum order quantity",
    nameEn: "Name (English)",
    nameZh: "Name (Chinese)",
    primaryCategory: "Primary category ID",
    region: "Region ID",
    slug: "Slug",
    sourceName: "Source name",
    sourceUrl: "Source URL",
    summaryEn: "Summary (English)",
    summaryZh: "Summary (Chinese)",
  },
  formError: "Review the form values.",
  instructions: "Review staging records.",
  loading: "Loading operations data…",
  noSelection: "Select a record.",
  publish: "Publish",
  publishingBlocked: "Verify this factory before publishing it.",
  reviewConfirmation: "I completed the SOP.",
  reviewRecord: "Save the review record.",
  retry: "Retry",
  save: "Save changes",
  saving: "Saving…",
  statusDraft: "Draft",
  statusPublished: "Published",
  unpublish: "Unpublish",
  unverified: "Unverified",
  verificationReset: "Saving marks this factory unverified.",
  verified: "Verified",
  verify: "Verify factory",
};

const cluster: GetAdminCluster200Data = {
  boundary: {
    coordinates: [
      [
        [
          [120, 30],
          [121, 30],
          [121, 31],
          [120, 30],
        ],
      ],
    ],
    type: "MultiPolygon",
  },
  categoryIds: [categoryId],
  centroid: { coordinates: [120.5, 30.5], type: "Point" },
  coverImage: null,
  createdAt: timestamp,
  description: { en: "Cluster description", zh: "产业带描述" },
  id: clusterId,
  mainProducts: [{ en: "Fasteners", zh: "紧固件" }],
  name: { en: "Ningbo Fasteners", zh: "宁波紧固件" },
  primaryCategoryId: categoryId,
  publishedAt: null,
  regionId,
  slug: "ningbo-fasteners",
  stats: null,
  status: "draft",
  summary: { en: "Fastener cluster", zh: "紧固件产业带" },
  updatedAt: timestamp,
};

const factory: GetAdminFactory200Data = {
  address: { en: "1 Factory Road", zh: "工厂路1号" },
  categoryIds: [categoryId],
  certifications: ["ISO 9001"],
  clusterId,
  contact: { email: "sales@example.test" },
  createdAt: timestamp,
  employeeRange: "100-199",
  establishedYear: 2012,
  id: factoryId,
  images: [],
  lastVerifiedAt: null,
  location: { coordinates: [120.6, 30.6], type: "Point" },
  mainProducts: [{ en: "Bolts", zh: "螺栓" }],
  moq: "1000 pieces",
  name: { en: "Ningbo Bolt Factory", zh: "宁波螺栓厂" },
  publishedAt: null,
  regionId,
  slug: "ningbo-bolt-factory",
  sourceName: "Official registry",
  sourceUrl: "https://example.test/registry",
  status: "draft",
  updatedAt: timestamp,
  verified: false,
  verifiedAt: null,
  verifiedBy: null,
};

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

describe("operations data forms", () => {
  it("builds a complete cluster PATCH body with WGS-84 boundary data", () => {
    const boundary = JSON.stringify(cluster.boundary);
    const update = buildClusterUpdate(
      formData({
        boundary,
        categoryIds: categoryId,
        centroidLat: "30.5",
        centroidLng: "120.5",
        descriptionEn: "Cluster description",
        descriptionZh: "产业带描述",
        mainProducts: "Fasteners | 紧固件",
        nameEn: "Ningbo Fasteners",
        nameZh: "宁波紧固件",
        primaryCategoryId: categoryId,
        regionId,
        slug: "ningbo-fasteners",
        summaryEn: "Fastener cluster",
        summaryZh: "紧固件产业带",
      }),
    );

    expect(update.boundary).toEqual(cluster.boundary);
    expect(update.centroid?.coordinates).toEqual([120.5, 30.5]);
    expect(update.mainProducts).toEqual([{ en: "Fasteners", zh: "紧固件" }]);
  });

  it("builds a factory PATCH body and normalizes nullable contact fields", () => {
    const update = buildFactoryUpdate(
      formData({
        addressEn: "1 Factory Road",
        addressZh: "工厂路1号",
        categoryIds: categoryId,
        certifications: "ISO 9001\nBSCI",
        clusterId,
        email: "sales@example.test",
        establishedYear: "2012",
        locationLat: "30.6",
        locationLng: "120.6",
        mainProducts: "Bolts | 螺栓",
        nameEn: "Ningbo Bolt Factory",
        nameZh: "宁波螺栓厂",
        regionId,
        slug: "ningbo-bolt-factory",
        sourceName: "Official registry",
        sourceUrl: "https://example.test/registry",
      }),
    );

    expect(update.contact).toEqual({ email: "sales@example.test" });
    expect(update.certifications).toEqual(["ISO 9001", "BSCI"]);
    expect(update.establishedYear).toBe(2012);
    expect(update.location?.coordinates).toEqual([120.6, 30.6]);
  });

  it("rejects ambiguous product lines, duplicate IDs, and invalid years", () => {
    expect(() => parseProducts("Bolts")).toThrow();
    expect(() => parseIdList(`${categoryId}\n${categoryId}`)).toThrow();
    expect(() =>
      buildFactoryUpdate(
        formData({
          addressEn: "1 Factory Road",
          addressZh: "工厂路1号",
          categoryIds: categoryId,
          establishedYear: "2012.5",
          locationLat: "30.6",
          locationLng: "120.6",
          mainProducts: "Bolts | 螺栓",
          nameEn: "Ningbo Bolt Factory",
          nameZh: "宁波螺栓厂",
          regionId,
          slug: "ningbo-bolt-factory",
        }),
      ),
    ).toThrow();
  });
});

describe("operations review components", () => {
  it("renders list status and verification state immediately", () => {
    const clusters: GetAdminClusters200DataItem[] = [
      {
        factoryCount: 5,
        id: clusterId,
        name: cluster.name,
        publishedAt: null,
        slug: cluster.slug,
        status: "draft",
        updatedAt: timestamp,
      },
    ];
    const factories: GetAdminFactories200DataItem[] = [
      {
        id: factoryId,
        name: factory.name,
        publishedAt: null,
        slug: factory.slug,
        status: "draft",
        updatedAt: timestamp,
        verified: false,
      },
    ];
    const markup = renderToStaticMarkup(
      <OpsEntityLists
        clusters={clusters}
        factories={factories}
        labels={labels}
        onSelect={vi.fn()}
        selection={{ id: factoryId, kind: "factory" }}
      />,
    );

    expect(markup).toContain("Ningbo Fasteners");
    expect(markup).toContain("Ningbo Bolt Factory");
    expect(markup).toContain("Unverified");
    expect(markup).toContain('aria-pressed="true"');
  });

  it("requires SOP confirmation before cluster publication", () => {
    const markup = renderToStaticMarkup(
      <ClusterEditor
        actionError={false}
        data={cluster}
        labels={labels}
        onAction={vi.fn()}
        onRetry={vi.fn()}
        onSave={vi.fn()}
        pending={false}
      />,
    );

    expect(markup).toContain("Boundary GeoJSON (MultiPolygon)");
    expect(markup).toContain("I completed the SOP.");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Publish<\/button>/u);
  });

  it("blocks unverified publication and exposes verify/error/retry feedback", () => {
    const markup = renderToStaticMarkup(
      <FactoryEditor
        actionError
        data={factory}
        labels={labels}
        onAction={vi.fn()}
        onRetry={vi.fn()}
        onSave={vi.fn()}
        pending={false}
      />,
    );

    expect(markup).toContain("Unverified");
    expect(markup).toContain("Verify factory");
    expect(markup).toContain("Verify this factory before publishing it.");
    expect(markup).toContain("The operation could not be completed.");
    expect(markup).toContain("Retry");
    expect(markup).toContain('role="alert"');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Publish<\/button>/u);
  });
});

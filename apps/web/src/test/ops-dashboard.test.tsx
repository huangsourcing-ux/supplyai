import type {
  GetAdminCluster200Data,
  GetAdminClusters200DataItem,
  GetAdminFactories200DataItem,
  GetAdminFactory200Data,
} from "@chinasupply/api-client";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ClusterCreateEditor,
  ClusterEditor,
  FactoryCreateEditor,
  FactoryEditor,
  OpsEntityLists,
  type OpsLabels,
} from "../app/(frontend)/ops/ops-dashboard";
import {
  buildClusterCreate,
  buildClusterUpdate,
  buildFactoryCreate,
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
  clusterList: "Industrial clusters",
  emptyList: "No records found.",
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
  map: {
    ariaLabel: "WGS-84 location picker",
    attributionLabel: "Map attribution",
    instructions: "Click the map or drag the pin.",
    loading: "Loading map…",
    mapError: "Map unavailable.",
    mapTilerLogoAlt: "MapTiler",
    retry: "Retry",
  },
  media: {
    altEn: "Alt (English)",
    altZh: "Alt (Chinese)",
    attachRetry: "Retry reference",
    chooseImage: "Image file",
    clear: "Clear reference",
    clusterCover: "Cluster cover image",
    detach: "Detach image",
    factoryImages: "Factory images",
    fileRequirements: "JPEG, PNG, or WebP; 1 byte–10 MB.",
    moveDown: "Move down",
    moveUp: "Move up",
    noMedia: "No media is referenced.",
    referenceError: "Reference failed.",
    saveAlt: "Save alt text",
    success: "Media saved.",
    upload: "Upload and attach",
    uploadError: "Upload failed.",
    uploading: "Uploading…",
    verificationReset: "Saving marks this factory unverified.",
  },
  newCluster: "New cluster",
  newFactory: "New factory",
  newRecord: "New draft record",
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
  uploadAfterCreate: "Save the draft first.",
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

  it("builds cluster and factory create bodies without media references", () => {
    const clusterCreate = buildClusterCreate(
      formData({
        boundary: "",
        categoryIds: categoryId,
        centroidLat: "30.5",
        centroidLng: "120.5",
        descriptionEn: "",
        descriptionZh: "",
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
    const factoryCreate = buildFactoryCreate(
      formData({
        addressEn: "1 Factory Road",
        addressZh: "工厂路1号",
        categoryIds: categoryId,
        certifications: "",
        clusterId: "",
        email: "",
        employeeRange: "",
        establishedYear: "",
        locationLat: "30.6",
        locationLng: "120.6",
        mainProducts: "Bolts | 螺栓",
        moq: "",
        nameEn: "Ningbo Bolt Factory",
        nameZh: "宁波螺栓厂",
        phone: "",
        regionId,
        slug: "ningbo-bolt-factory",
        sourceName: "",
        sourceUrl: "",
        website: "",
        wechat: "",
      }),
    );

    expect(clusterCreate).not.toHaveProperty("coverImageObjectKey");
    expect(clusterCreate).not.toHaveProperty("boundary");
    expect(factoryCreate).not.toHaveProperty("images");
    expect(factoryCreate.contact).toBeUndefined();
    expect(factoryCreate.clusterId).toBeNull();
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

  it("rejects longitude and latitude outside WGS-84 bounds", () => {
    expect(() =>
      buildClusterCreate(
        formData({
          categoryIds: categoryId,
          centroidLat: "91",
          centroidLng: "181",
          mainProducts: "Fasteners | 紧固件",
          nameEn: "Ningbo Fasteners",
          nameZh: "宁波紧固件",
          primaryCategoryId: categoryId,
          regionId,
          slug: "ningbo-fasteners",
          summaryEn: "Fastener cluster",
          summaryZh: "紧固件产业带",
        }),
      ),
    ).toThrow();
  });
});

describe("operations review components", () => {
  it("renders cluster and factory create forms with manual map fallback", () => {
    const clusterMarkup = renderToStaticMarkup(
      <ClusterCreateEditor
        actionError={false}
        labels={labels}
        onRetry={vi.fn()}
        onSave={vi.fn()}
        pending={false}
      />,
    );
    const factoryMarkup = renderToStaticMarkup(
      <FactoryCreateEditor
        actionError={false}
        labels={labels}
        onRetry={vi.fn()}
        onSave={vi.fn()}
        pending={false}
      />,
    );

    expect(clusterMarkup).toContain("New draft record");
    expect(clusterMarkup).toContain('name="centroidLng"');
    expect(clusterMarkup).toContain('data-coordinate-order="lng-lat"');
    expect(factoryMarkup).toContain('name="locationLat"');
    expect(factoryMarkup).toContain("Save the draft first.");
  });

  it("renders list status, verification state, and singular ICU counts", () => {
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
      <NextIntlClientProvider
        locale="en"
        messages={{
          Operations: {
            dashboard: {
              clusterCount:
                "{count, plural, one {# cluster} other {# clusters}}",
              factoryCount:
                "{count, plural, one {# factory} other {# factories}}",
            },
          },
        }}
        timeZone="UTC"
      >
        <OpsEntityLists
          clusters={clusters}
          factories={factories}
          labels={labels}
          onSelect={vi.fn()}
          selection={{ id: factoryId, kind: "factory" }}
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain("Ningbo Fasteners");
    expect(markup).toContain("Ningbo Bolt Factory");
    expect(markup).toContain("1 cluster");
    expect(markup).toContain("1 factory");
    expect(markup).toContain("Unverified");
    expect(markup).toContain('aria-pressed="true"');
  });

  it("renders plural ICU counts inside the client translation boundary", () => {
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
      {
        factoryCount: 5,
        id: "clu_23456789012345678",
        name: { en: "Second cluster", zh: "第二产业带" },
        publishedAt: null,
        slug: "second-cluster",
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
      {
        id: "fac_23456789012345678",
        name: { en: "Second factory", zh: "第二工厂" },
        publishedAt: null,
        slug: "second-factory",
        status: "draft",
        updatedAt: timestamp,
        verified: false,
      },
    ];
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en"
        messages={{
          Operations: {
            dashboard: {
              clusterCount:
                "{count, plural, one {# cluster} other {# clusters}}",
              factoryCount:
                "{count, plural, one {# factory} other {# factories}}",
            },
          },
        }}
        timeZone="UTC"
      >
        <OpsEntityLists
          clusters={clusters}
          factories={factories}
          labels={labels}
          onSelect={vi.fn()}
          selection={null}
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain("2 clusters");
    expect(markup).toContain("2 factories");
  });

  it("requires SOP confirmation before cluster publication", () => {
    const markup = renderToStaticMarkup(
      <ClusterEditor
        actionError={false}
        data={cluster}
        getRequest={vi.fn(async () => ({}))}
        labels={labels}
        onAction={vi.fn()}
        onMediaUpdate={vi.fn(async () => undefined)}
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
        getRequest={vi.fn(async () => ({}))}
        labels={labels}
        onAction={vi.fn()}
        onMediaUpdate={vi.fn(async () => undefined)}
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

  it("renders cover replacement, factory image management, and verification warning", () => {
    const clusterMarkup = renderToStaticMarkup(
      <ClusterEditor
        actionError={false}
        data={{
          ...cluster,
          coverImage: {
            objectKey: "staging/clusters/cover.jpg",
            url: "https://media.example.test/cover.jpg",
          },
        }}
        getRequest={vi.fn(async () => ({}))}
        labels={labels}
        onAction={vi.fn()}
        onMediaUpdate={vi.fn(async () => undefined)}
        onRetry={vi.fn()}
        onSave={vi.fn()}
        pending={false}
      />,
    );
    const factoryMarkup = renderToStaticMarkup(
      <FactoryEditor
        actionError={false}
        data={{
          ...factory,
          images: [
            {
              alt: { en: "Factory front", zh: "工厂正面" },
              objectKey: "staging/factories/front.jpg",
              url: "https://media.example.test/front.jpg",
            },
          ],
        }}
        getRequest={vi.fn(async () => ({}))}
        labels={labels}
        onAction={vi.fn()}
        onMediaUpdate={vi.fn(async () => undefined)}
        onRetry={vi.fn()}
        onSave={vi.fn()}
        pending={false}
      />,
    );

    expect(clusterMarkup).toContain("Cluster cover image");
    expect(clusterMarkup).toContain("Clear reference");
    expect(factoryMarkup).toContain("Factory front");
    expect(factoryMarkup).toContain("Save alt text");
    expect(factoryMarkup).toContain("Move up");
    expect(factoryMarkup).toContain("Detach image");
    expect(factoryMarkup).toContain("Saving marks this factory unverified.");
  });
});

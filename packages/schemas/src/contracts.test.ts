import { describe, expect, it } from "vitest";

import * as contracts from "./index.js";

const ID_A = "abcdefghijklmnopqrstu";
const ID_B = "123456789012345678901";
const ID_C = "zyxwvutsrqponmlkjihgf";
const NOW = "2026-07-23T12:00:00.000Z";
const NEXT = contracts.encodeCursor({ v: 1, sort: [NOW, ID_A] });

const point = {
  type: "Point",
  coordinates: [120.1, 30.2],
} as const;

const boundary = {
  type: "MultiPolygon",
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
} as const;

const localized = { en: "Lighting", zh: "照明" };
const region = {
  id: ID_A,
  level: "city",
  name: "Zhongshan",
};
const primaryCategory = {
  id: ID_B,
  parentId: null,
  slug: "lighting",
  name: "Lighting",
  icon: "bulb",
  color: "#FFAA00",
  sortOrder: 1,
};
const childCategory = {
  id: ID_C,
  parentId: ID_B,
  slug: "led-lighting",
  name: "LED Lighting",
  icon: null,
  color: null,
  sortOrder: 2,
};
const clusterSummary = {
  id: ID_A,
  slug: "guzhen-lighting",
  name: "Guzhen Lighting Cluster",
  region,
  primaryCategory,
  centroid: point,
  summary: "Decorative lighting manufacturing",
  mainProducts: ["LED bulbs"],
  coverImageUrl: "https://media.example.com/clusters/a.webp",
  factoryCount: 25,
  publishedAt: NOW,
};
const clusterDetail = {
  ...clusterSummary,
  categories: [primaryCategory, childCategory],
  boundary,
  description: "Long description",
  stats: { annualOutputUsd: 1000000, note: "Estimate" },
};
const factorySummary = {
  id: ID_C,
  slug: "bright-lighting",
  name: "Bright Lighting",
  cluster: {
    id: ID_A,
    slug: "guzhen-lighting",
    name: "Guzhen Lighting Cluster",
  },
  region,
  location: point,
  mainProducts: ["LED bulbs"],
  verified: true,
  imageUrl: "https://media.example.com/factories/a.webp",
  publishedAt: NOW,
};
const factoryDetail = {
  ...factorySummary,
  categories: [primaryCategory],
  address: { en: "1 Factory Road", zh: "工厂路1号" },
  certifications: ["ISO9001"],
  moq: "100 pieces",
  establishedYear: 2010,
  employeeRange: "100-500",
  contact: { email: "sales@example.com" },
  images: [
    {
      url: "https://media.example.com/factories/a.webp",
      alt: "Factory exterior",
    },
  ],
  sourceName: "Official website",
  sourceUrl: "https://example.com/source",
  verifiedAt: NOW,
  lastVerifiedAt: NOW,
  relatedFactories: [factorySummary],
};

const standard = (data: unknown) => ({ data, error: null, meta: {} });
const paginated = (data: unknown) => ({
  data,
  error: null,
  meta: { nextCursor: NEXT },
});

const adminCluster = {
  id: ID_A,
  slug: "guzhen-lighting",
  name: localized,
  regionId: ID_A,
  primaryCategoryId: ID_B,
  categoryIds: [ID_B, ID_C],
  centroid: point,
  boundary,
  summary: {
    en: "Decorative lighting manufacturing",
    zh: "装饰照明制造",
  },
  description: null,
  mainProducts: [{ en: "LED bulbs", zh: "LED灯泡" }],
  coverImage: {
    objectKey: "clusters/a/cover.webp",
    url: "https://media.example.com/clusters/a/cover.webp",
  },
  stats: null,
  status: "draft",
  publishedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};
const adminFactory = {
  id: ID_C,
  slug: "bright-lighting",
  name: { en: "Bright Lighting", zh: "光明照明" },
  clusterId: ID_A,
  regionId: ID_A,
  categoryIds: [ID_B],
  address: { en: "1 Factory Road", zh: "工厂路1号" },
  location: point,
  mainProducts: [{ en: "LED bulbs", zh: "LED灯泡" }],
  certifications: ["ISO9001"],
  moq: null,
  establishedYear: 2010,
  employeeRange: "100-500",
  contact: { email: "sales@example.com" },
  images: [
    {
      objectKey: "factories/a/exterior.webp",
      url: "https://media.example.com/factories/a/exterior.webp",
      alt: { en: "Factory exterior", zh: "工厂外观" },
    },
  ],
  sourceName: "Official website",
  sourceUrl: "https://example.com/source",
  verified: false,
  verifiedAt: null,
  lastVerifiedAt: null,
  verifiedBy: null,
  status: "draft",
  publishedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const pointFeature = {
  type: "Feature",
  geometry: point,
  properties: {
    id: ID_A,
    slug: "guzhen-lighting",
    name_en: "Guzhen Lighting Cluster",
    primaryCategoryId: ID_B,
    color: "#FFAA00",
    factoryCount: 25,
  },
};
const boundaryFeature = { ...pointFeature, geometry: boundary };
const factoryFeature = {
  type: "Feature",
  geometry: point,
  properties: {
    id: ID_C,
    slug: "bright-lighting",
    name_en: "Bright Lighting",
    verified: true,
    clusterId: ID_A,
  },
};

describe("V1 endpoint contracts", () => {
  it.each([
    [
      "A-1 query",
      contracts.getClustersQuerySchema,
      { limit: "20", category: "lighting", region: ID_A },
    ],
    [
      "A-1 response",
      contracts.getClustersResponseSchema,
      paginated([clusterSummary]),
    ],
    [
      "A-2 params",
      contracts.getClusterParamsSchema,
      { slug: "guzhen-lighting" },
    ],
    [
      "A-2 response",
      contracts.getClusterResponseSchema,
      standard(clusterDetail),
    ],
    [
      "A-3 params",
      contracts.getClusterFactoriesParamsSchema,
      { slug: "guzhen-lighting" },
    ],
    ["A-3 query", contracts.getClusterFactoriesQuerySchema, { cursor: NEXT }],
    [
      "A-3 response",
      contracts.getClusterFactoriesResponseSchema,
      paginated([factorySummary]),
    ],
    [
      "A-4 query",
      contracts.getFactoriesQuerySchema,
      { category: "lighting", cluster: "guzhen-lighting", verified: "true" },
    ],
    [
      "A-4 response",
      contracts.getFactoriesResponseSchema,
      paginated([factorySummary]),
    ],
    [
      "A-5 params",
      contracts.getFactoryParamsSchema,
      { slug: "bright-lighting" },
    ],
    [
      "A-5 response",
      contracts.getFactoryResponseSchema,
      standard(factoryDetail),
    ],
    ["A-6 query", contracts.searchQuerySchema, { q: "led" }],
    [
      "A-6 response",
      contracts.searchResponseSchema,
      standard({
        categories: [
          {
            type: "category",
            id: ID_B,
            slug: "lighting",
            name: "Lighting",
            color: "#FFAA00",
          },
        ],
        clusters: [
          {
            type: "cluster",
            id: ID_A,
            slug: "guzhen-lighting",
            name: "Guzhen Lighting Cluster",
            centroid: point,
            factoryCount: 25,
          },
        ],
        factories: [
          {
            type: "factory",
            id: ID_C,
            slug: "bright-lighting",
            name: "Bright Lighting",
            location: point,
            verified: true,
          },
        ],
      }),
    ],
    ["A-7 query", contracts.getCategoriesQuerySchema, {}],
    [
      "A-7 response",
      contracts.getCategoriesResponseSchema,
      standard([
        { ...primaryCategory, parentId: null, children: [childCategory] },
      ]),
    ],
    ["A-8 GET query", contracts.getFavoritesQuerySchema, {}],
    [
      "A-8 GET response",
      contracts.getFavoritesResponseSchema,
      paginated([
        {
          id: ID_B,
          targetType: "cluster",
          targetId: ID_A,
          createdAt: NOW,
          target: clusterSummary,
        },
      ]),
    ],
    [
      "A-8 POST body",
      contracts.createFavoriteBodySchema,
      { targetType: "factory", targetId: ID_C },
    ],
    [
      "A-8 POST response",
      contracts.createFavoriteResponseSchema,
      standard({
        id: ID_B,
        targetType: "factory",
        targetId: ID_C,
        createdAt: NOW,
        target: factorySummary,
      }),
    ],
    [
      "A-8 DELETE params",
      contracts.deleteFavoriteParamsSchema,
      { targetType: "factory", targetId: ID_C },
    ],
    [
      "A-8 DELETE response",
      contracts.deleteFavoriteResponseSchema,
      standard({ targetType: "factory", targetId: ID_C, absent: true }),
    ],
    ["A-9 body", contracts.updateMeBodySchema, { name: "Buyer", locale: "en" }],
    [
      "A-9 response",
      contracts.updateMeResponseSchema,
      standard({
        id: "user_123",
        email: "buyer@example.com",
        name: "Buyer",
        locale: "en",
      }),
    ],
    [
      "A-10 response",
      contracts.deleteMeResponseSchema,
      standard({ deletionRequested: true }),
    ],
    [
      "A-11 headers",
      contracts.clerkWebhookHeadersSchema,
      {
        "svix-id": "msg_123",
        "svix-timestamp": "1784822400",
        "svix-signature": "v1,signature",
      },
    ],
    [
      "A-11 body",
      contracts.clerkWebhookBodySchema,
      {
        object: "event",
        instance_id: "ins_123",
        timestamp: 1784822400000,
        type: "user.created",
        data: {
          id: "user_123",
          first_name: "Buyer",
          last_name: null,
          primary_email_address_id: "idn_123",
          email_addresses: [
            {
              id: "idn_123",
              email_address: "buyer@example.com",
              providerExtra: true,
            },
          ],
          providerExtra: true,
        },
        providerExtra: true,
      },
    ],
    [
      "A-11 response",
      contracts.clerkWebhookResponseSchema,
      standard({ processed: true, duplicate: false }),
    ],
    [
      "MAP-1 query",
      contracts.getMapClusterPointsQuerySchema,
      { category: "lighting" },
    ],
    [
      "MAP-1 response",
      contracts.getMapClusterPointsResponseSchema,
      standard({ type: "FeatureCollection", features: [pointFeature] }),
    ],
    [
      "MAP-2 query",
      contracts.getMapClusterBoundariesQuerySchema,
      { bbox: "119,29,122,32", category: "lighting", zoom: "10" },
    ],
    [
      "MAP-2 response",
      contracts.getMapClusterBoundariesResponseSchema,
      standard({ type: "FeatureCollection", features: [boundaryFeature] }),
    ],
    [
      "MAP-3 query",
      contracts.getMapFactoriesQuerySchema,
      { bbox: "119,29,122,32", cluster: "guzhen-lighting", verified: "false" },
    ],
    [
      "MAP-3 response",
      contracts.getMapFactoriesResponseSchema,
      {
        data: { type: "FeatureCollection", features: [factoryFeature] },
        error: null,
        meta: { truncated: false },
      },
    ],
    ["ADM-1 list query", contracts.getAdminClustersQuerySchema, {}],
    [
      "ADM-1 list response",
      contracts.getAdminClustersResponseSchema,
      paginated([
        {
          id: ID_A,
          slug: "guzhen-lighting",
          name: localized,
          status: "draft",
          factoryCount: 25,
          publishedAt: null,
          updatedAt: NOW,
        },
      ]),
    ],
    [
      "ADM-1 create body",
      contracts.createAdminClusterBodySchema,
      {
        slug: "guzhen-lighting",
        name: localized,
        regionId: ID_A,
        primaryCategoryId: ID_B,
        categoryIds: [ID_B],
        centroid: point,
        summary: { en: "Lighting", zh: "灯饰" },
        mainProducts: [{ en: "LED bulbs", zh: "LED灯泡" }],
      },
    ],
    [
      "ADM-1 create response",
      contracts.createAdminClusterResponseSchema,
      standard(adminCluster),
    ],
    [
      "ADM-1 detail params",
      contracts.getAdminClusterParamsSchema,
      { id: ID_A },
    ],
    [
      "ADM-1 detail response",
      contracts.getAdminClusterResponseSchema,
      standard(adminCluster),
    ],
    [
      "ADM-1 patch params",
      contracts.updateAdminClusterParamsSchema,
      { id: ID_A },
    ],
    [
      "ADM-1 patch body",
      contracts.updateAdminClusterBodySchema,
      { summary: { en: "Updated", zh: "已更新" } },
    ],
    [
      "ADM-1 patch response",
      contracts.updateAdminClusterResponseSchema,
      standard(adminCluster),
    ],
    [
      "ADM-2 publish params",
      contracts.publishAdminClusterParamsSchema,
      { id: ID_A },
    ],
    [
      "ADM-2 publish response",
      contracts.publishAdminClusterResponseSchema,
      standard(adminCluster),
    ],
    [
      "ADM-2 unpublish params",
      contracts.unpublishAdminClusterParamsSchema,
      { id: ID_A },
    ],
    [
      "ADM-2 unpublish response",
      contracts.unpublishAdminClusterResponseSchema,
      standard(adminCluster),
    ],
    ["ADM-3 list query", contracts.getAdminFactoriesQuerySchema, {}],
    [
      "ADM-3 list response",
      contracts.getAdminFactoriesResponseSchema,
      paginated([
        {
          id: ID_C,
          slug: "bright-lighting",
          name: adminFactory.name,
          status: "draft",
          verified: false,
          publishedAt: null,
          updatedAt: NOW,
        },
      ]),
    ],
    [
      "ADM-3 create body",
      contracts.createAdminFactoryBodySchema,
      {
        slug: "bright-lighting",
        name: adminFactory.name,
        regionId: ID_A,
        categoryIds: [ID_B],
        address: adminFactory.address,
        location: point,
        mainProducts: adminFactory.mainProducts,
      },
    ],
    [
      "ADM-3 create response",
      contracts.createAdminFactoryResponseSchema,
      standard(adminFactory),
    ],
    [
      "ADM-3 detail params",
      contracts.getAdminFactoryParamsSchema,
      { id: ID_C },
    ],
    [
      "ADM-3 detail response",
      contracts.getAdminFactoryResponseSchema,
      standard(adminFactory),
    ],
    [
      "ADM-3 patch params",
      contracts.updateAdminFactoryParamsSchema,
      { id: ID_C },
    ],
    [
      "ADM-3 patch body",
      contracts.updateAdminFactoryBodySchema,
      { moq: "200 pieces" },
    ],
    [
      "ADM-3 patch response",
      contracts.updateAdminFactoryResponseSchema,
      standard(adminFactory),
    ],
    [
      "ADM-4 publish params",
      contracts.publishAdminFactoryParamsSchema,
      { id: ID_C },
    ],
    [
      "ADM-4 publish response",
      contracts.publishAdminFactoryResponseSchema,
      standard(adminFactory),
    ],
    [
      "ADM-4 unpublish params",
      contracts.unpublishAdminFactoryParamsSchema,
      { id: ID_C },
    ],
    [
      "ADM-4 unpublish response",
      contracts.unpublishAdminFactoryResponseSchema,
      standard(adminFactory),
    ],
    [
      "ADM-5 verify params",
      contracts.verifyAdminFactoryParamsSchema,
      { id: ID_C },
    ],
    [
      "ADM-5 verify response",
      contracts.verifyAdminFactoryResponseSchema,
      standard(adminFactory),
    ],
    [
      "ADM-6 body",
      contracts.createUploadPresignBodySchema,
      {
        kind: "factory-image",
        entityId: ID_C,
        fileName: "exterior.webp",
        contentType: "image/webp",
        contentLength: 1024,
      },
    ],
    [
      "ADM-6 response",
      contracts.createUploadPresignResponseSchema,
      standard({
        objectKey: "factories/a/exterior.webp",
        uploadUrl:
          "https://account.r2.cloudflarestorage.com/bucket/object?signature=abc",
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        expiresAt: NOW,
      }),
    ],
  ])("accepts the frozen %s contract", (_name, schema, value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });
});

describe("contract rejection boundaries", () => {
  it("accepts only the frozen error envelope and UTC timestamps", () => {
    expect(
      contracts.apiErrorEnvelopeSchema.parse({
        data: null,
        error: {
          code: contracts.ApiErrorCode.ValidationError,
          message: "Invalid request",
          details: [{ code: "too_small", message: "Too small", path: ["q"] }],
        },
        meta: null,
      }),
    ).toBeDefined();
    expect(() =>
      contracts.apiErrorEnvelopeSchema.parse({
        data: null,
        error: { code: "CONFLICT", message: "Conflict", details: [] },
        meta: null,
      }),
    ).toThrow();
    expect(() =>
      contracts.utcDateTimeSchema.parse("2026-07-23T08:00:00-04:00"),
    ).toThrow();
  });

  it("rejects malformed filters and search input", () => {
    expect(() =>
      contracts.getFactoriesQuerySchema.parse({ verified: "1" }),
    ).toThrow();
    expect(() => contracts.searchQuerySchema.parse({ q: "x" })).toThrow();
    expect(() =>
      contracts.getMapClusterBoundariesQuerySchema.parse({
        bbox: "122,32,119,29",
        zoom: 25,
      }),
    ).toThrow();
  });

  it("rejects invalid coordinates and unclosed polygons", () => {
    expect(() =>
      contracts.geoJsonPointSchema.parse({
        type: "Point",
        coordinates: [30, 120],
      }),
    ).toThrow();
    expect(() =>
      contracts.geoJsonMultiPolygonSchema.parse({
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [120, 30],
              [121, 30],
              [121, 31],
              [120, 31],
            ],
          ],
        ],
      }),
    ).toThrow();
  });

  it("rejects more than 5000 MAP-3 features", () => {
    expect(() =>
      contracts.mapFactoriesCollectionSchema.parse({
        type: "FeatureCollection",
        features: Array.from({ length: 5001 }, () => factoryFeature),
      }),
    ).toThrow();
  });

  it("rejects empty Admin patches and protected server fields", () => {
    expect(() => contracts.updateAdminClusterBodySchema.parse({})).toThrow();
    expect(() =>
      contracts.updateAdminFactoryBodySchema.parse({
        status: "published",
        verified: true,
      }),
    ).toThrow();
  });

  it("rejects unsafe upload declarations", () => {
    expect(() =>
      contracts.createUploadPresignBodySchema.parse({
        kind: "factory-image",
        entityId: ID_C,
        fileName: "payload.svg",
        contentType: "image/svg+xml",
        contentLength: 1024,
      }),
    ).toThrow();
    expect(() =>
      contracts.createUploadPresignBodySchema.parse({
        kind: "factory-image",
        entityId: ID_C,
        fileName: "large.webp",
        contentType: "image/webp",
        contentLength: contracts.MAX_UPLOAD_BYTES + 1,
      }),
    ).toThrow();
    expect(() =>
      contracts.createUploadPresignBodySchema.parse({
        kind: "factory-image",
        entityId: ID_C,
        fileName: "../escape.webp",
        contentType: "image/webp",
        contentLength: 1024,
      }),
    ).toThrow();
  });

  it("rejects Clerk user events without the declared primary email", () => {
    expect(() =>
      contracts.clerkWebhookBodySchema.parse({
        object: "event",
        instance_id: "ins_123",
        timestamp: 1784822400000,
        type: "user.updated",
        data: {
          id: "user_123",
          first_name: "Buyer",
          last_name: null,
          primary_email_address_id: "idn_missing",
          email_addresses: [
            {
              id: "idn_123",
              email_address: "buyer@example.com",
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("keeps public media object keys and extra MAP properties out", () => {
    expect(() =>
      contracts.publicFactoryImageSchema.parse({
        url: "https://media.example.com/a.webp",
        alt: "Factory",
        objectKey: "factories/a.webp",
      }),
    ).toThrow();
    expect(() =>
      contracts.mapFactoryPropertiesSchema.parse({
        ...factoryFeature.properties,
        coverImageUrl: "https://media.example.com/a.webp",
      }),
    ).toThrow();
  });
});

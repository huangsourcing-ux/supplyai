import { decodeCursor } from "@chinasupply/schemas";
import { describe, expect, it } from "vitest";

import {
  toPublicFactoryDetail,
  toPublicFactorySummary,
  type PublicFactoryDetailRow,
  type PublicFactoryRow,
} from "../src/factories/factory.mapper.js";
import { paginateFactoryRows } from "../src/factories/factories.service.js";
import type { PublicMediaUrlService } from "../src/media/public-media-url.service.js";

const detailRow: PublicFactoryDetailRow = {
  address: { en: "1 Factory Road", zh: "工厂路1号" },
  certifications: ["ISO9001", "BSCI"],
  clusterId: "clusteraaaaaaaaaaaaaa",
  clusterName: { en: "Lighting Cluster", zh: "照明产业带" },
  clusterSlug: "lighting-cluster",
  contact: {
    email: "sales@example.com",
    website: "https://factory.example.com",
  },
  employeeRange: "100-500",
  establishedYear: 2008,
  factoryClusterId: "clusteraaaaaaaaaaaaaa",
  id: "factoryaaaaaaaaaaaaaa",
  images: [
    {
      alt: { en: "Factory exterior", zh: "工厂外观" },
      objectKey: "staging/factories/a/front door.webp",
    },
    {
      alt: { en: "Production line", zh: "生产线" },
      objectKey: "staging/factories/a/line.webp",
    },
  ],
  lastVerifiedAt: new Date("2026-07-20T12:00:00.000Z"),
  location: [120.1, 30.2],
  mainProducts: [{ en: "LED bulbs", zh: "LED 灯泡" }],
  moq: "100 pieces",
  name: { en: "Bright Factory", zh: "光明工厂" },
  publishedAt: new Date("2026-07-24T12:00:00.000Z"),
  regionId: "regionaaaaaaaaaaaaaaa",
  regionLevel: "city",
  regionName: { en: "Zhongshan", zh: "中山" },
  slug: "bright-factory",
  sourceName: "Industry directory",
  sourceUrl: "https://source.example.com/bright-factory",
  verified: true,
  verifiedAt: new Date("2026-07-01T12:00:00.000Z"),
};

const relatedRow: PublicFactoryRow = {
  ...detailRow,
  id: "factorybbbbbbbbbbbbbb",
  images: [],
  name: { en: "Related Factory", zh: "关联工厂" },
  publishedAt: new Date("2026-07-23T12:00:00.000Z"),
  slug: "related-factory",
};

const mediaUrls = {
  resolve: (objectKey: string | null) =>
    objectKey === null
      ? null
      : `https://cdn.example.com/${encodeURI(objectKey)}`,
} as PublicMediaUrlService;

describe("public factory mapping", () => {
  it("maps the frozen summary and detail DTOs without leaking private fields", () => {
    const detail = toPublicFactoryDetail(
      detailRow,
      [
        {
          color: "#112233",
          icon: "bulb",
          id: "categoryaaaaaaaaaaaaa",
          name: { en: "Lighting", zh: "照明" },
          parentId: null,
          slug: "lighting",
          sortOrder: 1,
        },
      ],
      [relatedRow],
      mediaUrls,
    );

    expect(detail).toMatchObject({
      address: { en: "1 Factory Road", zh: "工厂路1号" },
      categories: [{ name: "Lighting", slug: "lighting" }],
      cluster: {
        id: "clusteraaaaaaaaaaaaaa",
        name: "Lighting Cluster",
        slug: "lighting-cluster",
      },
      imageUrl: "https://cdn.example.com/staging/factories/a/front%20door.webp",
      images: [
        {
          alt: "Factory exterior",
          url: "https://cdn.example.com/staging/factories/a/front%20door.webp",
        },
        {
          alt: "Production line",
          url: "https://cdn.example.com/staging/factories/a/line.webp",
        },
      ],
      location: { coordinates: [120.1, 30.2], type: "Point" },
      mainProducts: ["LED bulbs"],
      name: "Bright Factory",
      relatedFactories: [
        {
          id: "factorybbbbbbbbbbbbbb",
          imageUrl: null,
          name: "Related Factory",
        },
      ],
    });

    expect(detail).not.toHaveProperty("factoryClusterId");
    expect(detail).not.toHaveProperty("locationGcj02");
    expect(detail).not.toHaveProperty("verifiedBy");
    expect(JSON.stringify(detail.relatedFactories)).not.toContain("关联工厂");
  });

  it("returns a null public cluster and image when no public references exist", () => {
    const summary = toPublicFactorySummary(
      {
        ...detailRow,
        clusterId: null,
        clusterName: null,
        clusterSlug: null,
        images: [],
      },
      mediaUrls,
    );

    expect(summary.cluster).toBeNull();
    expect(summary.imageUrl).toBeNull();
  });

  it("emits a cursor only when an extra row proves another page exists", () => {
    const publishedAt = new Date("2026-07-24T12:00:00.000Z");
    const rows = [
      { id: "zzzzzzzzzzzzzzzzzzzzz", publishedAt },
      { id: "yyyyyyyyyyyyyyyyyyyyy", publishedAt },
      { id: "xxxxxxxxxxxxxxxxxxxxx", publishedAt },
    ];

    const page = paginateFactoryRows(rows, 2);
    expect(page.pageRows).toHaveLength(2);
    expect(decodeCursor(page.nextCursor ?? "")).toEqual({
      sort: ["2026-07-24T12:00:00.000Z", "yyyyyyyyyyyyyyyyyyyyy"],
      v: 1,
    });
    expect(paginateFactoryRows(rows.slice(0, 2), 2).nextCursor).toBeNull();
  });
});

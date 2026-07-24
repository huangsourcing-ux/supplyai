import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  configureApiClient,
  getCategories,
  getCluster,
  getClusterFactories,
  getClusters,
  getFactories,
  getFactory,
  search,
} from "@chinasupply/api-client";
import {
  getCategoriesResponseSchema,
  getClusterFactoriesResponseSchema,
  getClusterResponseSchema,
  getClustersResponseSchema,
  getFactoriesResponseSchema,
  getFactoryResponseSchema,
  searchResponseSchema,
} from "@chinasupply/schemas";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Pool, type PoolClient } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { registerEdgeProxy } from "../src/common/http/edge-proxy.js";
import { configureHttpApplication } from "../src/http-application.js";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const postgresPort = 5432;
const redisPort = 6379;
const mediaBaseUrl = "https://media.example.test/assets";
const postgresCredentials = {
  database: "chinasupply_public_catalog_e2e",
  password: "chinasupply_public_catalog_e2e_only",
  user: "chinasupply",
};

const ids = {
  apparel: "aaaaaaaaaaaaaaaaaaaaa",
  bulbs: "bbbbbbbbbbbbbbbbbbbbb",
  cityA: "ccccccccccccccccccccc",
  cityB: "ddddddddddddddddddddd",
  clusterDraft: "wwwwwwwwwwwwwwwwwwwww",
  clusterOld: "xxxxxxxxxxxxxxxxxxxxx",
  clusterSecond: "yyyyyyyyyyyyyyyyyyyyy",
  clusterTop: "zzzzzzzzzzzzzzzzzzzzz",
  factoryDetail: "777777777777777777777",
  factoryDraftCluster: "666666666666666666666",
  furniture: "fffffffffffffffffffff",
  hosiery: "hhhhhhhhhhhhhhhhhhhhh",
  led: "eeeeeeeeeeeeeeeeeeeee",
  lighting: "lllllllllllllllllllll",
} as const;

function runMigration(databaseUrl: string): void {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["--filter", "@chinasupply/api", "db:migrate"],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        APP_ENV: "local",
        DATABASE_URL: databaseUrl,
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(
      ["Core migration failed", result.stdout, result.stderr].join("\n"),
    );
  }
}

async function insertRegion(
  client: PoolClient,
  input: { id: string; name: string; point: [number, number] },
): Promise<void> {
  await client.query(
    `insert into regions (id, level, name, centroid)
     values (
       $1,
       'city',
       $2::jsonb,
       ST_SetSRID(ST_MakePoint($3, $4), 4326)
     )`,
    [
      input.id,
      JSON.stringify({ en: input.name, zh: `${input.name} 中文` }),
      ...input.point,
    ],
  );
}

async function insertCategory(
  client: PoolClient,
  input: {
    aliases?: { en?: string[]; zh?: string[] };
    color: string | null;
    id: string;
    name: string;
    parentId?: string;
    searchTextEn?: string;
    searchTextZh?: string;
    slug: string;
    sortOrder: number;
    zhName?: string;
  },
): Promise<void> {
  await client.query(
    `insert into categories
       (id, parent_id, name, slug, icon, color, aliases, sort_order,
        search_text_en, search_text_zh)
     values ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
    [
      input.id,
      input.parentId ?? null,
      JSON.stringify({
        en: input.name,
        zh: input.zhName ?? `${input.name} 中文`,
      }),
      input.slug,
      input.parentId === undefined ? `${input.slug}-icon` : null,
      input.color,
      JSON.stringify(input.aliases ?? {}),
      input.sortOrder,
      input.searchTextEn ?? input.name.toLowerCase(),
      input.searchTextZh ?? `${input.name} 中文`,
    ],
  );
}

async function insertCluster(
  client: PoolClient,
  input: {
    categoryIds: string[];
    coverImage?: string;
    id: string;
    primaryCategoryId: string;
    publishedAt: string | null;
    regionId: string;
    searchTextEn?: string;
    searchTextZh?: string;
    slug: string;
    status: "draft" | "published";
    withBoundary?: boolean;
  },
): Promise<void> {
  await client.query("begin");
  try {
    await client.query(
      `insert into clusters
         (id, slug, name, region_id, primary_category_id, centroid, boundary,
          summary, description, main_products, cover_image, stats, status,
          published_at, search_text_en, search_text_zh)
       values (
         $1,
         $2,
         $3::jsonb,
         $4,
         $5,
         ST_SetSRID(ST_MakePoint(120.2, 30.3), 4326),
         case
           when $6::boolean then ST_SetSRID(
             ST_GeomFromGeoJSON(
               '{"type":"MultiPolygon","coordinates":[[[[120,30],[121,30],[121,31],[120,30]]]]}'
             ),
             4326
           )
           else null
         end,
         $7::jsonb,
         $8::jsonb,
         $9::jsonb,
         $10,
         $11::jsonb,
         $12,
         $13::timestamptz,
         $14,
         $15
       )`,
      [
        input.id,
        input.slug,
        JSON.stringify({
          en: `${input.slug} name`,
          zh: `${input.slug} 名称`,
        }),
        input.regionId,
        input.primaryCategoryId,
        input.withBoundary ?? false,
        JSON.stringify({
          en: `${input.slug} summary`,
          zh: `${input.slug} 简介`,
        }),
        JSON.stringify({
          en: `${input.slug} description`,
          zh: `${input.slug} 详情`,
        }),
        JSON.stringify([{ en: "LED bulbs", zh: "LED 灯泡" }]),
        input.coverImage ?? null,
        JSON.stringify({
          annualOutputUsd: 1_000_000,
          exportShare: 0.5,
          note: { en: "Estimate", zh: "估算" },
        }),
        input.status,
        input.publishedAt,
        input.searchTextEn ?? `${input.slug} lighting`,
        input.searchTextZh ?? `${input.slug} 照明`,
      ],
    );

    for (const categoryId of input.categoryIds) {
      await client.query(
        `insert into cluster_categories (cluster_id, category_id)
         values ($1, $2)`,
        [input.id, categoryId],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function insertFactory(
  client: PoolClient,
  input: {
    address?: { en: string; zh: string };
    categoryIds?: string[];
    clusterId: string | null;
    images?: {
      alt: { en: string; zh: string };
      objectKey: string;
    }[];
    id: string;
    name?: { en: string; zh: string };
    publishedAt: string | null;
    searchTextEn?: string;
    searchTextZh?: string;
    slug?: string;
    status: "draft" | "published";
    verified?: boolean;
    withDetail?: boolean;
  },
): Promise<void> {
  const slug = input.slug ?? `factory-${input.id.slice(0, 8)}`;

  await client.query("begin");
  try {
    await client.query(
      `insert into factories
         (id, slug, name, cluster_id, region_id, address, location,
          location_gcj02, main_products, certifications, moq,
          established_year, employee_range, contact, images, source_name,
          source_url, verified, verified_at, last_verified_at, verified_by,
          status, published_at, search_text_en, search_text_zh)
       values (
         $1,
         $2,
         $3::jsonb,
         $4,
         $5,
         $6::jsonb,
         ST_SetSRID(ST_MakePoint(120.3, 30.4), 4326),
         $7::jsonb,
         $8::jsonb,
         $9::text[],
         $10,
         $11,
         $12,
         $13::jsonb,
         $14::jsonb,
         $15,
         $16,
         $17,
         $18::timestamptz,
         $19::timestamptz,
         $20,
         $21,
         $22::timestamptz,
         $23,
         $24
       )`,
      [
        input.id,
        slug,
        JSON.stringify(
          input.name ?? { en: `${slug} name`, zh: `${slug} 名称` },
        ),
        input.clusterId,
        ids.cityA,
        JSON.stringify(input.address ?? { en: "Factory Road", zh: "工厂路" }),
        JSON.stringify({ lng: 120.31, lat: 30.41 }),
        JSON.stringify([{ en: "LED bulbs", zh: "LED 灯泡" }]),
        input.withDetail ? ["ISO9001", "BSCI"] : [],
        input.withDetail ? "100 pieces" : null,
        input.withDetail ? 2008 : null,
        input.withDetail ? "100-500" : null,
        input.withDetail
          ? JSON.stringify({
              email: "sales@example.test",
              website: "https://factory.example.test",
            })
          : null,
        JSON.stringify(input.images ?? []),
        input.withDetail ? "Industry directory" : null,
        input.withDetail ? "https://source.example.test/factory" : null,
        input.verified ?? false,
        input.verified ? "2026-07-01T12:00:00.000Z" : null,
        input.verified ? "2026-07-20T12:00:00.000Z" : null,
        input.verified ? "clerk_admin_test" : null,
        input.status,
        input.publishedAt,
        input.searchTextEn ?? `${slug} led`,
        input.searchTextZh ?? `${slug} 工厂`,
      ],
    );

    for (const categoryId of input.categoryIds ?? []) {
      await client.query(
        `insert into factory_categories (factory_id, category_id)
         values ($1, $2)`,
        [input.id, categoryId],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

describe.sequential("public catalog API", () => {
  let app: NestFastifyApplication;
  let pool: Pool;
  let postgres: StartedTestContainer;
  let redis: StartedTestContainer;

  beforeAll(async () => {
    [postgres, redis] = await Promise.all([
      new GenericContainer("postgis/postgis:17-3.5")
        .withEnvironment({
          POSTGRES_DB: postgresCredentials.database,
          POSTGRES_PASSWORD: postgresCredentials.password,
          POSTGRES_USER: postgresCredentials.user,
        })
        .withExposedPorts(postgresPort)
        .withPlatform("linux/amd64")
        .withStartupTimeout(120_000)
        .withWaitStrategy(
          Wait.forLogMessage(
            /database system is ready to accept connections/,
            2,
          ),
        )
        .start(),
      new GenericContainer("redis:7.4-alpine")
        .withExposedPorts(redisPort)
        .withStartupTimeout(60_000)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
        .start(),
    ]);

    const databaseUrl = `postgresql://${postgresCredentials.user}:${postgresCredentials.password}@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/${postgresCredentials.database}`;
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(redisPort)}`;
    Object.assign(process.env, {
      APP_ENV: "local",
      DATABASE_URL: databaseUrl,
      PORT: "3001",
      REDIS_URL: redisUrl,
      R2_CDN_BASE_URL: mediaBaseUrl,
      WEB_ORIGIN: "http://localhost:3000",
    });

    runMigration(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    try {
      await insertRegion(client, {
        id: ids.cityA,
        name: "Zhongshan",
        point: [113.4, 22.5],
      });
      await insertRegion(client, {
        id: ids.cityB,
        name: "Yiwu",
        point: [120.1, 29.3],
      });
      await insertCategory(client, {
        color: "#AA5500",
        id: ids.apparel,
        name: "Apparel",
        slug: "apparel",
        sortOrder: 1,
      });
      await insertCategory(client, {
        color: "#112233",
        id: ids.lighting,
        name: "Lighting",
        slug: "lighting",
        sortOrder: 1,
      });
      await insertCategory(client, {
        color: null,
        id: ids.bulbs,
        name: "Bulbs",
        parentId: ids.lighting,
        slug: "bulbs",
        sortOrder: 3,
      });
      await insertCategory(client, {
        color: null,
        id: ids.led,
        name: "LED Lighting",
        parentId: ids.lighting,
        searchTextEn: "LED lighting",
        searchTextZh: "LED灯 LED 灯饰",
        slug: "led-lighting",
        sortOrder: 2,
      });
      await insertCategory(client, {
        aliases: { en: ["sofa"], zh: ["沙发"] },
        color: null,
        id: ids.furniture,
        name: "Furniture",
        parentId: ids.apparel,
        searchTextEn: "Furniture sofa",
        searchTextZh: "家具 沙发",
        slug: "furniture",
        sortOrder: 1,
        zhName: "家具",
      });
      await insertCategory(client, {
        aliases: { en: ["socks"], zh: ["袜子"] },
        color: null,
        id: ids.hosiery,
        name: "Hosiery",
        parentId: ids.apparel,
        searchTextEn: "Hosiery socks",
        searchTextZh: "袜子 针织",
        slug: "hosiery",
        sortOrder: 2,
        zhName: "袜类",
      });

      await insertCluster(client, {
        categoryIds: [ids.lighting, ids.led],
        coverImage: "staging/clusters/top cover.webp",
        id: ids.clusterTop,
        primaryCategoryId: ids.lighting,
        publishedAt: "2026-07-24T12:00:00.000Z",
        regionId: ids.cityA,
        searchTextEn: "top lighting LED lamps",
        searchTextZh: "top 灯饰 LED灯",
        slug: "top-lighting",
        status: "published",
        withBoundary: true,
      });
      await insertCluster(client, {
        categoryIds: [ids.lighting, ids.apparel, ids.furniture, ids.hosiery],
        id: ids.clusterSecond,
        primaryCategoryId: ids.lighting,
        publishedAt: "2026-07-24T12:00:00.000Z",
        regionId: ids.cityA,
        searchTextEn: "second lighting furniture sofa hosiery socks",
        searchTextZh: "家具产业带 沙发 袜子",
        slug: "second-lighting",
        status: "published",
      });
      await insertCluster(client, {
        categoryIds: [ids.lighting],
        id: ids.clusterOld,
        primaryCategoryId: ids.lighting,
        publishedAt: "2026-07-23T12:00:00.000Z",
        regionId: ids.cityB,
        slug: "old-lighting",
        status: "published",
      });
      await insertCluster(client, {
        categoryIds: [ids.lighting, ids.led],
        id: ids.clusterDraft,
        primaryCategoryId: ids.lighting,
        publishedAt: null,
        regionId: ids.cityA,
        slug: "draft-lighting",
        status: "draft",
      });

      await insertFactory(client, {
        categoryIds: [ids.lighting, ids.led],
        clusterId: ids.clusterTop,
        id: "111111111111111111111",
        images: [
          {
            alt: { en: "Factory exterior", zh: "工厂外观" },
            objectKey: "staging/factories/top front.webp",
          },
        ],
        publishedAt: "2026-07-24T12:00:00.000Z",
        searchTextEn: "factory LED lighting",
        searchTextZh: "LED灯 工厂 灯饰",
        status: "published",
        verified: true,
      });
      await insertFactory(client, {
        categoryIds: [ids.bulbs],
        clusterId: ids.clusterTop,
        id: "222222222222222222222",
        publishedAt: "2026-07-24T12:00:00.000Z",
        searchTextEn: "bulbs sokcs",
        status: "published",
      });
      await insertFactory(client, {
        clusterId: ids.clusterTop,
        id: "333333333333333333333",
        publishedAt: null,
        status: "draft",
      });
      await insertFactory(client, {
        clusterId: ids.clusterTop,
        id: "444444444444444444444",
        publishedAt: null,
        status: "published",
      });
      await insertFactory(client, {
        categoryIds: [ids.apparel, ids.hosiery],
        clusterId: ids.clusterSecond,
        id: "555555555555555555555",
        publishedAt: "2026-07-24T10:00:00.000Z",
        searchTextEn: "hosiery socks factory",
        searchTextZh: "袜子 工厂 家具",
        status: "published",
      });
      await insertFactory(client, {
        categoryIds: [ids.lighting],
        clusterId: ids.clusterDraft,
        id: ids.factoryDraftCluster,
        publishedAt: "2026-07-24T09:00:00.000Z",
        slug: "draft-cluster-factory",
        status: "published",
      });
      await insertFactory(client, {
        address: {
          en: "1 Verified Factory Road",
          zh: "认证工厂路1号",
        },
        categoryIds: [ids.lighting, ids.led],
        clusterId: ids.clusterOld,
        id: ids.factoryDetail,
        images: [
          {
            alt: { en: "Factory exterior", zh: "工厂外观" },
            objectKey: "staging/factories/detail front.webp",
          },
          {
            alt: { en: "Production line", zh: "生产线" },
            objectKey: "staging/factories/production.webp",
          },
        ],
        name: { en: "Verified Lighting Factory", zh: "认证照明工厂" },
        publishedAt: "2026-07-23T12:00:00.000Z",
        slug: "verified-lighting-factory",
        status: "published",
        verified: true,
        withDetail: true,
      });

      for (let index = 1; index <= 11; index += 1) {
        await insertFactory(client, {
          clusterId: ids.clusterOld,
          id: `related${String(index).padStart(14, "0")}`,
          publishedAt: `2026-07-22T${String(23 - index).padStart(2, "0")}:00:00.000Z`,
          slug: `related-factory-${index}`,
          status: "published",
        });
      }
    } finally {
      client.release();
    }

    const adapter = new FastifyAdapter();
    registerEdgeProxy(adapter.getInstance(), { appEnvironment: "local" });
    app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
      logger: ["error"],
    });
    configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    await app.listen(0, "127.0.0.1");
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await Promise.all([postgres?.stop(), redis?.stop()]);
  });

  it("returns the stable two-level category tree including empty roots", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
    });
    const body = getCategoriesResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(body.data.map((category) => category.slug)).toEqual([
      "apparel",
      "lighting",
    ]);
    expect(body.data[0]?.children.map((category) => category.slug)).toEqual([
      "furniture",
      "hosiery",
    ]);
    expect(body.data[1]?.children.map((category) => category.slug)).toEqual([
      "led-lighting",
      "bulbs",
    ]);
    expect(body.data[1]?.name).toBe("Lighting");
  });

  it("filters published clusters and calculates public factory counts", async () => {
    const defaultResponse = await app.inject({
      method: "GET",
      url: "/api/v1/clusters",
    });
    expect(
      getClustersResponseSchema.parse(defaultResponse.json()).data,
    ).toHaveLength(3);

    const maximumResponse = await app.inject({
      method: "GET",
      url: "/api/v1/clusters?limit=100",
    });
    expect(
      getClustersResponseSchema.parse(maximumResponse.json()).data,
    ).toHaveLength(3);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/clusters?category=lighting&region=${ids.cityA}&limit=20`,
    });
    const body = getClustersResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(body.data.map((cluster) => cluster.slug)).toEqual([
      "top-lighting",
      "second-lighting",
    ]);
    expect(body.data[0]).toMatchObject({
      coverImageUrl:
        "https://media.example.test/assets/staging/clusters/top%20cover.webp",
      factoryCount: 2,
      name: "top-lighting name",
    });
    expect(body.data[1]?.factoryCount).toBe(1);

    const childResponse = await app.inject({
      method: "GET",
      url: "/api/v1/clusters?category=led-lighting",
    });
    expect(
      getClustersResponseSchema
        .parse(childResponse.json())
        .data.map((cluster) => cluster.slug),
    ).toEqual(["top-lighting"]);

    const emptyResponse = await app.inject({
      method: "GET",
      url: "/api/v1/clusters?region=qqqqqqqqqqqqqqqqqqqqq",
    });
    expect(getClustersResponseSchema.parse(emptyResponse.json()).data).toEqual(
      [],
    );
  });

  it("paginates equal timestamps without duplicates or omissions", async () => {
    const firstResponse = await app.inject({
      method: "GET",
      url: "/api/v1/clusters?limit=2",
    });
    const firstPage = getClustersResponseSchema.parse(firstResponse.json());

    expect(firstPage.data.map((cluster) => cluster.id)).toEqual([
      ids.clusterTop,
      ids.clusterSecond,
    ]);
    expect(firstPage.meta.nextCursor).not.toBeNull();

    const secondResponse = await app.inject({
      method: "GET",
      url: `/api/v1/clusters?limit=2&cursor=${encodeURIComponent(
        firstPage.meta.nextCursor ?? "",
      )}`,
    });
    const secondPage = getClustersResponseSchema.parse(secondResponse.json());

    expect(secondPage.data.map((cluster) => cluster.id)).toEqual([
      ids.clusterOld,
    ]);
    expect(secondPage.meta.nextCursor).toBeNull();
    expect(
      new Set([...firstPage.data, ...secondPage.data].map(({ id }) => id)).size,
    ).toBe(3);
  });

  it("returns published detail with boundary, categories, stats, and live count", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/clusters/top-lighting",
    });
    const body = getClusterResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(body.data).toMatchObject({
      boundary: { type: "MultiPolygon" },
      categories: [{ slug: "lighting" }, { slug: "led-lighting" }],
      description: "top-lighting description",
      factoryCount: 2,
      stats: {
        annualOutputUsd: 1_000_000,
        exportShare: 0.5,
        note: "Estimate",
      },
    });
    expect(JSON.stringify(body)).not.toContain("名称");
  });

  it("lists cluster factories with stable cursor pagination", async () => {
    const firstResponse = await app.inject({
      method: "GET",
      url: "/api/v1/clusters/top-lighting/factories?limit=1",
    });
    const firstPage = getClusterFactoriesResponseSchema.parse(
      firstResponse.json(),
    );

    expect(firstResponse.statusCode).toBe(200);
    expect(firstPage.data.map((factory) => factory.id)).toEqual([
      "222222222222222222222",
    ]);
    expect(firstPage.meta.nextCursor).not.toBeNull();

    const secondResponse = await app.inject({
      method: "GET",
      url: `/api/v1/clusters/top-lighting/factories?limit=1&cursor=${encodeURIComponent(
        firstPage.meta.nextCursor ?? "",
      )}`,
    });
    const secondPage = getClusterFactoriesResponseSchema.parse(
      secondResponse.json(),
    );

    expect(secondPage.data.map((factory) => factory.id)).toEqual([
      "111111111111111111111",
    ]);
    expect(secondPage.meta.nextCursor).toBeNull();
    expect(
      new Set([...firstPage.data, ...secondPage.data].map(({ id }) => id)).size,
    ).toBe(2);
  });

  it("filters published factories and hides draft cluster references", async () => {
    const filteredResponse = await app.inject({
      method: "GET",
      url: "/api/v1/factories?category=led-lighting&cluster=top-lighting&verified=true",
    });
    const filtered = getFactoriesResponseSchema.parse(filteredResponse.json());

    expect(filteredResponse.statusCode).toBe(200);
    expect(filtered.data.map((factory) => factory.id)).toEqual([
      "111111111111111111111",
    ]);
    expect(filtered.data[0]).toMatchObject({
      cluster: { slug: "top-lighting" },
      imageUrl:
        "https://media.example.test/assets/staging/factories/top%20front.webp",
      verified: true,
    });

    const childCategoryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/factories?category=bulbs&verified=false",
    });
    expect(
      getFactoriesResponseSchema
        .parse(childCategoryResponse.json())
        .data.map((factory) => factory.id),
    ).toEqual(["222222222222222222222"]);

    const draftClusterFilterResponse = await app.inject({
      method: "GET",
      url: "/api/v1/factories?cluster=draft-lighting",
    });
    expect(
      getFactoriesResponseSchema.parse(draftClusterFilterResponse.json()).data,
    ).toEqual([]);

    const defaultResponse = await app.inject({
      method: "GET",
      url: "/api/v1/factories?limit=100",
    });
    const draftClusterFactory = getFactoriesResponseSchema
      .parse(defaultResponse.json())
      .data.find((factory) => factory.id === ids.factoryDraftCluster);

    expect(draftClusterFactory).toMatchObject({
      cluster: null,
      slug: "draft-cluster-factory",
    });
  });

  it("returns full factory detail with bounded published related factories", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/factories/verified-lighting-factory",
    });
    const body = getFactoryResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(body.data).toMatchObject({
      address: {
        en: "1 Verified Factory Road",
        zh: "认证工厂路1号",
      },
      categories: [{ slug: "lighting" }, { slug: "led-lighting" }],
      certifications: ["ISO9001", "BSCI"],
      cluster: { slug: "old-lighting" },
      contact: {
        email: "sales@example.test",
        website: "https://factory.example.test",
      },
      employeeRange: "100-500",
      establishedYear: 2008,
      imageUrl:
        "https://media.example.test/assets/staging/factories/detail%20front.webp",
      images: [
        {
          alt: "Factory exterior",
          url: "https://media.example.test/assets/staging/factories/detail%20front.webp",
        },
        {
          alt: "Production line",
          url: "https://media.example.test/assets/staging/factories/production.webp",
        },
      ],
      location: { coordinates: [120.3, 30.4], type: "Point" },
      moq: "100 pieces",
      sourceName: "Industry directory",
      verified: true,
      verifiedAt: "2026-07-01T12:00:00.000Z",
    });
    expect(body.data.relatedFactories).toHaveLength(10);
    expect(body.data.relatedFactories.map((factory) => factory.slug)).toEqual([
      "related-factory-1",
      "related-factory-2",
      "related-factory-3",
      "related-factory-4",
      "related-factory-5",
      "related-factory-6",
      "related-factory-7",
      "related-factory-8",
      "related-factory-9",
      "related-factory-10",
    ]);
    expect(
      body.data.relatedFactories.some(
        (factory) => factory.id === ids.factoryDetail,
      ),
    ).toBe(false);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("objectKey");
    expect(serialized).not.toContain("locationGcj02");
    expect(serialized).not.toContain("verifiedBy");
    expect(serialized).not.toContain("认证照明工厂");
    expect(serialized).toContain("认证工厂路1号");
  });

  it("returns no related or draft cluster data for a public factory", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/factories/draft-cluster-factory",
    });
    const body = getFactoryResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(body.data.cluster).toBeNull();
    expect(body.data.relatedFactories).toEqual([]);
  });

  it("searches English, aliases, Chinese, and mixed-language terms", async () => {
    const ledResponse = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=led",
    });
    const led = searchResponseSchema.parse(ledResponse.json());

    expect(ledResponse.statusCode).toBe(200);
    expect(led.meta).toEqual({});
    expect(led.data.categories.map(({ slug }) => slug)).toContain(
      "led-lighting",
    );
    expect(led.data.clusters[0]).toMatchObject({
      centroid: { coordinates: [120.2, 30.3], type: "Point" },
      factoryCount: 2,
      name: "top-lighting name",
      slug: "top-lighting",
      type: "cluster",
    });
    expect(led.data.factories).toHaveLength(5);
    expect(led.data.factories.map(({ id }) => id)).toEqual([
      "111111111111111111111",
      ids.factoryDraftCluster,
      ids.factoryDetail,
      "related00000000000001",
      "related00000000000002",
    ]);
    expect(led.data.factories[0]).toMatchObject({
      location: { coordinates: [120.3, 30.4], type: "Point" },
      type: "factory",
    });
    expect(
      led.data.factories.some(({ id }) =>
        ["333333333333333333333", "444444444444444444444"].includes(id),
      ),
    ).toBe(false);

    const socksResponse = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=socks",
    });
    const socks = searchResponseSchema.parse(socksResponse.json());

    expect(socks.data.categories[0]?.slug).toBe("hosiery");
    expect(socks.data.clusters[0]?.slug).toBe("second-lighting");
    const socksFactoryIds = socks.data.factories.map(({ id }) => id);
    expect(socksFactoryIds[0]).toBe("555555555555555555555");
    expect(socksFactoryIds).toContain("222222222222222222222");
    expect(socksFactoryIds.indexOf("555555555555555555555")).toBeLessThan(
      socksFactoryIds.indexOf("222222222222222222222"),
    );

    const sofaResponse = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=sofa",
    });
    const sofa = searchResponseSchema.parse(sofaResponse.json());

    expect(sofa.data.categories[0]?.slug).toBe("furniture");
    expect(sofa.data.clusters.map(({ slug }) => slug)).toEqual([
      "second-lighting",
    ]);

    const chineseResponse = await app.inject({
      method: "GET",
      url: `/api/v1/search?q=${encodeURIComponent("家具")}`,
    });
    const chinese = searchResponseSchema.parse(chineseResponse.json());

    expect(chinese.data.categories.map(({ slug }) => slug)).toEqual([
      "furniture",
    ]);
    expect(chinese.data.clusters.map(({ slug }) => slug)).toEqual([
      "second-lighting",
    ]);
    expect(chinese.data.factories.map(({ id }) => id)).toEqual([
      "555555555555555555555",
    ]);

    const mixedResponse = await app.inject({
      method: "GET",
      url: `/api/v1/search?q=${encodeURIComponent("LED灯")}`,
    });
    const mixed = searchResponseSchema.parse(mixedResponse.json());

    expect(mixed.data.categories.map(({ slug }) => slug)).toContain(
      "led-lighting",
    );
    expect(mixed.data.clusters.map(({ slug }) => slug)).toContain(
      "top-lighting",
    );
    expect(mixed.data.factories.map(({ id }) => id)).toContain(
      "111111111111111111111",
    );

    const draftResponse = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=draft-lighting",
    });
    const draft = searchResponseSchema.parse(draftResponse.json());

    expect(draft.data.clusters.some(({ id }) => id === ids.clusterDraft)).toBe(
      false,
    );
  });

  it("returns frozen validation and not-found envelopes", async () => {
    for (const url of [
      "/api/v1/categories?unexpected=true",
      "/api/v1/clusters?limit=101",
      "/api/v1/clusters?region=short",
      "/api/v1/clusters?cursor=not-a-cursor",
      "/api/v1/clusters/INVALID_SLUG",
      "/api/v1/clusters/top-lighting/factories?limit=101",
      "/api/v1/factories?cursor=not-a-cursor",
      "/api/v1/factories?unexpected=true",
      "/api/v1/factories?verified=1",
      "/api/v1/factories?cluster=INVALID_SLUG",
      "/api/v1/factories/INVALID_SLUG",
      "/api/v1/search",
      "/api/v1/search?q=x",
      `/api/v1/search?q=${"x".repeat(101)}`,
    ]) {
      const response = await app.inject({ method: "GET", url });
      const body = response.json();
      expect(response.statusCode, url).toBe(400);
      expect(body.error.code, url).toBe("VALIDATION_ERROR");
      expect(body.error.details.length, url).toBeGreaterThan(0);
    }

    for (const slug of ["draft-lighting", "missing-lighting"]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/clusters/${slug}`,
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        data: null,
        error: {
          code: "NOT_FOUND",
          details: [],
          message: "Resource not found",
        },
        meta: null,
      });
    }

    for (const slug of ["draft-lighting", "missing-lighting"]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/clusters/${slug}/factories`,
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("NOT_FOUND");
    }

    for (const slug of [
      "factory-33333333",
      "factory-44444444",
      "missing-factory",
    ]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/factories/${slug}`,
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("NOT_FOUND");
    }
  });

  it("serves all seven endpoints through the generated API client", async () => {
    configureApiClient({ baseUrl: `${await app.getUrl()}/api/v1` });

    const categoriesResponse = await getCategories();
    const clustersResponse = await getClusters({ limit: 2 });
    const clusterResponse = await getCluster("top-lighting");
    const clusterFactoriesResponse = await getClusterFactories("top-lighting", {
      limit: 1,
    });
    const factoriesResponse = await getFactories({
      cluster: "top-lighting",
      limit: 2,
    });
    const factoryResponse = await getFactory("verified-lighting-factory");
    const searchResponse = await search({ q: "sofa" });

    expect(
      getCategoriesResponseSchema.parse(categoriesResponse).data,
    ).toHaveLength(2);
    expect(getClustersResponseSchema.parse(clustersResponse).data).toHaveLength(
      2,
    );
    expect(getClusterResponseSchema.parse(clusterResponse).data.slug).toBe(
      "top-lighting",
    );
    expect(
      getClusterFactoriesResponseSchema.parse(clusterFactoriesResponse).data,
    ).toHaveLength(1);
    expect(
      getFactoriesResponseSchema.parse(factoriesResponse).data,
    ).toHaveLength(2);
    expect(getFactoryResponseSchema.parse(factoryResponse).data.slug).toBe(
      "verified-lighting-factory",
    );
    expect(
      searchResponseSchema.parse(searchResponse).data.categories[0]?.slug,
    ).toBe("furniture");
  });
});

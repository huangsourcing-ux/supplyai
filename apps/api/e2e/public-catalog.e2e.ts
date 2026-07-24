import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  configureApiClient,
  getCategories,
  getCluster,
  getClusters,
} from "@chinasupply/api-client";
import {
  getCategoriesResponseSchema,
  getClusterResponseSchema,
  getClustersResponseSchema,
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
    color: string | null;
    id: string;
    name: string;
    parentId?: string;
    slug: string;
    sortOrder: number;
  },
): Promise<void> {
  await client.query(
    `insert into categories
       (id, parent_id, name, slug, icon, color, sort_order, search_text_en, search_text_zh)
     values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)`,
    [
      input.id,
      input.parentId ?? null,
      JSON.stringify({ en: input.name, zh: `${input.name} 中文` }),
      input.slug,
      input.parentId === undefined ? `${input.slug}-icon` : null,
      input.color,
      input.sortOrder,
      input.name.toLowerCase(),
      `${input.name} 中文`,
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
        `${input.slug} lighting`,
        `${input.slug} 照明`,
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
    clusterId: string;
    id: string;
    publishedAt: string | null;
    status: "draft" | "published";
  },
): Promise<void> {
  await client.query(
    `insert into factories
       (id, slug, name, cluster_id, region_id, address, location,
        main_products, status, published_at, search_text_en, search_text_zh)
     values (
       $1,
       $2,
       $3::jsonb,
       $4,
       $5,
       $6::jsonb,
       ST_SetSRID(ST_MakePoint(120.3, 30.4), 4326),
       $7::jsonb,
       $8,
       $9::timestamptz,
       $10,
       $11
     )`,
    [
      input.id,
      `factory-${input.id.slice(0, 8)}`,
      JSON.stringify({ en: "Factory", zh: "工厂" }),
      input.clusterId,
      ids.cityA,
      JSON.stringify({ en: "Factory Road", zh: "工厂路" }),
      JSON.stringify([{ en: "LED bulbs", zh: "LED 灯泡" }]),
      input.status,
      input.publishedAt,
      "factory led",
      "工厂 LED",
    ],
  );
}

describe.sequential("public categories and clusters API", () => {
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
        slug: "led-lighting",
        sortOrder: 2,
      });

      await insertCluster(client, {
        categoryIds: [ids.lighting, ids.led],
        coverImage: "staging/clusters/top cover.webp",
        id: ids.clusterTop,
        primaryCategoryId: ids.lighting,
        publishedAt: "2026-07-24T12:00:00.000Z",
        regionId: ids.cityA,
        slug: "top-lighting",
        status: "published",
        withBoundary: true,
      });
      await insertCluster(client, {
        categoryIds: [ids.lighting],
        id: ids.clusterSecond,
        primaryCategoryId: ids.lighting,
        publishedAt: "2026-07-24T12:00:00.000Z",
        regionId: ids.cityA,
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
        clusterId: ids.clusterTop,
        id: "111111111111111111111",
        publishedAt: "2026-07-24T12:00:00.000Z",
        status: "published",
      });
      await insertFactory(client, {
        clusterId: ids.clusterTop,
        id: "222222222222222222222",
        publishedAt: "2026-07-24T11:00:00.000Z",
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
        clusterId: ids.clusterSecond,
        id: "555555555555555555555",
        publishedAt: "2026-07-24T10:00:00.000Z",
        status: "published",
      });
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
    expect(body.data[0]?.children).toEqual([]);
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

  it("returns frozen validation and not-found envelopes", async () => {
    for (const url of [
      "/api/v1/categories?unexpected=true",
      "/api/v1/clusters?limit=101",
      "/api/v1/clusters?region=short",
      "/api/v1/clusters?cursor=not-a-cursor",
      "/api/v1/clusters/INVALID_SLUG",
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
  });

  it("serves all three endpoints through the generated API client", async () => {
    configureApiClient({ baseUrl: `${await app.getUrl()}/api/v1` });

    const categoriesResponse = await getCategories();
    const clustersResponse = await getClusters({ limit: 2 });
    const clusterResponse = await getCluster("top-lighting");

    expect(
      getCategoriesResponseSchema.parse(categoriesResponse).data,
    ).toHaveLength(2);
    expect(getClustersResponseSchema.parse(clustersResponse).data).toHaveLength(
      2,
    );
    expect(getClusterResponseSchema.parse(clusterResponse).data.slug).toBe(
      "top-lighting",
    );
  });
});

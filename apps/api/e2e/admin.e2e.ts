import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AppModule } from "../src/app.module.js";
import {
  CLERK_TOKEN_VERIFIER,
  type ClerkTokenVerifier,
} from "../src/auth/admin-auth.guard.js";
import { MapCacheInvalidationService } from "../src/cache/map-cache-invalidation.service.js";
import { registerEdgeProxy } from "../src/common/http/edge-proxy.js";
import { configureHttpApplication } from "../src/http-application.js";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const postgresPort = 5432;
const redisPort = 6379;
const credentials = {
  database: "chinasupply_admin_e2e",
  password: "chinasupply_admin_e2e_only",
  user: "chinasupply",
};
const ids = {
  category: "catadmin0000000000000",
  cluster: "clusteradmin000000000",
  clusterSecond: "clusteradmin000000001",
  factory: "factoryadmin000000000",
  factorySecond: "factoryadmin000000001",
  region: "regionadmin0000000000",
} as const;
const adminHeaders = {
  authorization: "Bearer admin-token",
  host: "api-staging.chinasupply.ai",
};

function runMigration(databaseUrl: string): void {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["--filter", "@chinasupply/api", "db:migrate"],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, APP_ENV: "local", DATABASE_URL: databaseUrl },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      ["Core migration failed", result.stdout, result.stderr].join("\n"),
    );
  }
}

async function seed(pool: Pool): Promise<void> {
  await pool.query(
    `insert into regions (id, level, name, centroid)
     values ($1, 'city', $2::jsonb, ST_SetSRID(ST_MakePoint(120, 30), 4326))`,
    [ids.region, JSON.stringify({ en: "Admin City", zh: "管理城市" })],
  );
  await pool.query(
    `insert into categories
       (id, name, slug, color, aliases, search_text_en, search_text_zh)
     values ($1, $2::jsonb, 'admin-lighting', '#112233', $3::jsonb, 'lighting', '照明')`,
    [
      ids.category,
      JSON.stringify({ en: "Lighting", zh: "照明" }),
      JSON.stringify({ en: ["lamps"], zh: ["灯具"] }),
    ],
  );

  for (const [index, clusterId] of [ids.cluster, ids.clusterSecond].entries()) {
    await pool.query("begin");
    await pool.query(
      `insert into clusters
         (id, slug, name, region_id, primary_category_id, centroid, summary,
          main_products, search_text_en, search_text_zh, updated_at)
       values (
         $1, $2, $3::jsonb, $4, $5,
         ST_SetSRID(ST_MakePoint($6, $7), 4326), $8::jsonb, $9::jsonb,
         'old cluster search', '旧产业带搜索',
         now() - ($10 * interval '1 minute')
       )`,
      [
        clusterId,
        `admin-cluster-${index}`,
        JSON.stringify({
          en: `Admin Cluster ${index}`,
          zh: `管理产业带 ${index}`,
        }),
        ids.region,
        ids.category,
        120 + index,
        30 + index,
        JSON.stringify({ en: "Old summary", zh: "旧简介" }),
        JSON.stringify([{ en: "Old lights", zh: "旧灯具" }]),
        index,
      ],
    );
    await pool.query(
      `insert into cluster_categories (cluster_id, category_id)
       values ($1, $2)`,
      [clusterId, ids.category],
    );
    await pool.query("commit");
  }

  for (const [index, factoryId] of [ids.factory, ids.factorySecond].entries()) {
    await pool.query("begin");
    await pool.query(
      `insert into factories
         (id, slug, name, cluster_id, region_id, address, location,
          main_products, source_name, source_url, search_text_en,
          search_text_zh, updated_at)
       values (
         $1, $2, $3::jsonb, $4, $5, $6::jsonb,
         ST_SetSRID(ST_MakePoint($7, $8), 4326), $9::jsonb,
         'Official source', 'https://source.example.test/factory',
         'old factory search', '旧工厂搜索',
         now() - ($10 * interval '1 minute')
       )`,
      [
        factoryId,
        `admin-factory-${index}`,
        JSON.stringify({
          en: `Admin Factory ${index}`,
          zh: `管理工厂 ${index}`,
        }),
        ids.cluster,
        ids.region,
        JSON.stringify({ en: "Factory Road", zh: "工厂路" }),
        120.2 + index,
        30.2 + index,
        JSON.stringify([{ en: "Old bulbs", zh: "旧灯泡" }]),
        index,
      ],
    );
    await pool.query(
      `insert into factory_categories (factory_id, category_id)
       values ($1, $2)`,
      [factoryId, ids.category],
    );
    await pool.query("commit");
  }
}

describe.sequential("admin API e2e", () => {
  let postgres: StartedTestContainer;
  let redis: StartedTestContainer;
  let databaseUrl: string;
  let pool: Pool;
  let app: NestFastifyApplication;
  const purge = vi.fn<(origin: string) => Promise<void>>();
  const previousEnvironment = { ...process.env };

  beforeAll(async () => {
    [postgres, redis] = await Promise.all([
      new GenericContainer("postgis/postgis:17-3.5")
        .withEnvironment({
          POSTGRES_DB: credentials.database,
          POSTGRES_PASSWORD: credentials.password,
          POSTGRES_USER: credentials.user,
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
        .withStartupTimeout(120_000)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
        .start(),
    ]);

    databaseUrl = `postgresql://${credentials.user}:${credentials.password}@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/${credentials.database}`;
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(redisPort)}`;
    runMigration(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    await seed(pool);

    Object.assign(process.env, {
      APP_ENV: "local",
      DATABASE_URL: databaseUrl,
      PORT: "3001",
      R2_CDN_BASE_URL: "https://media.example.test/assets",
      REDIS_URL: redisUrl,
      WEB_ORIGIN: "http://localhost:3000",
    });

    const tokenVerifier: ClerkTokenVerifier = async (token) => {
      if (token === "admin-token") {
        return { metadata: { role: "admin" }, sub: "user_admin_reviewer" };
      }
      if (token === "viewer-token") {
        return { metadata: { role: "viewer" }, sub: "user_viewer" };
      }
      throw new Error("invalid token");
    };
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CLERK_TOKEN_VERIFIER)
      .useValue(tokenVerifier)
      .overrideProvider(MapCacheInvalidationService)
      .useValue({ purge })
      .compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ trustProxy: false }),
    );
    registerEdgeProxy(app.getHttpAdapter().getInstance(), {
      appEnvironment: "local",
    });
    configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await Promise.all([postgres?.stop(), redis?.stop()]);
    process.env = previousEnvironment;
  });

  it("enforces missing, invalid, and non-admin authentication", async () => {
    const missing = await app.inject({
      method: "GET",
      url: "/api/v1/admin/clusters",
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.json()).toMatchObject({
      data: null,
      error: { code: "UNAUTHORIZED" },
    });

    const invalid = await app.inject({
      headers: { authorization: "Bearer invalid-token" },
      method: "GET",
      url: "/api/v1/admin/clusters",
    });
    expect(invalid.statusCode).toBe(401);

    const forbidden = await app.inject({
      headers: { authorization: "Bearer viewer-token" },
      method: "GET",
      url: "/api/v1/admin/clusters",
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toMatchObject({
      data: null,
      error: { code: "FORBIDDEN" },
    });
  });

  it("lists drafts with stable updatedAt cursor pagination", async () => {
    const first = await app.inject({
      headers: adminHeaders,
      method: "GET",
      url: "/api/v1/admin/clusters?limit=1",
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.data).toHaveLength(1);
    expect(firstBody.data[0]).toMatchObject({ status: "draft" });
    expect(firstBody.meta.nextCursor).toEqual(expect.any(String));

    const second = await app.inject({
      headers: adminHeaders,
      method: "GET",
      url: `/api/v1/admin/clusters?limit=1&cursor=${encodeURIComponent(firstBody.meta.nextCursor)}`,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().data).toHaveLength(1);
    expect(second.json().data[0].id).not.toBe(firstBody.data[0].id);

    const factories = await app.inject({
      headers: adminHeaders,
      method: "GET",
      url: "/api/v1/admin/factories?limit=1",
    });
    expect(factories.statusCode).toBe(200);
    expect(factories.json()).toMatchObject({
      data: [{ status: "draft", verified: false }],
      meta: { nextCursor: expect.any(String) },
    });
  });

  it("patches clusters, rebuilds search text, and publishes idempotently", async () => {
    const update = await app.inject({
      headers: adminHeaders,
      method: "PATCH",
      payload: {
        mainProducts: [{ en: "Smart lamps", zh: "智能灯具" }],
        name: { en: "Smart Lighting Cluster", zh: "智能照明产业带" },
        summary: { en: "Smart lighting makers", zh: "智能照明制造商" },
      },
      url: `/api/v1/admin/clusters/${ids.cluster}`,
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().data).toMatchObject({
      categoryIds: [ids.category],
      name: { en: "Smart Lighting Cluster", zh: "智能照明产业带" },
      status: "draft",
    });
    const searchText = await pool.query<{
      search_text_en: string;
      search_text_zh: string;
    }>(`select search_text_en, search_text_zh from clusters where id = $1`, [
      ids.cluster,
    ]);
    expect(searchText.rows[0]?.search_text_en).toContain(
      "Smart Lighting Cluster Smart lamps Smart lighting makers Lighting lamps",
    );
    expect(searchText.rows[0]?.search_text_zh).toContain("灯具");

    const published = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/clusters/${ids.cluster}/publish`,
    });
    expect(published.statusCode).toBe(200);
    const firstPublishedAt = published.json().data.publishedAt;
    expect(firstPublishedAt).toEqual(expect.any(String));
    expect(purge).toHaveBeenLastCalledWith("http://api-staging.chinasupply.ai");

    const publishedAgain = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/clusters/${ids.cluster}/publish`,
    });
    expect(publishedAgain.statusCode).toBe(200);
    expect(publishedAgain.json().data.publishedAt).toBe(firstPublishedAt);

    const publicDetail = await app.inject({
      method: "GET",
      url: "/api/v1/clusters/admin-cluster-0",
    });
    expect(publicDetail.statusCode).toBe(200);

    const unpublished = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/clusters/${ids.cluster}/unpublish`,
    });
    expect(unpublished.statusCode).toBe(200);
    expect(unpublished.json().data).toMatchObject({
      publishedAt: firstPublishedAt,
      status: "draft",
    });
    const hidden = await app.inject({
      method: "GET",
      url: "/api/v1/clusters/admin-cluster-0",
    });
    expect(hidden.statusCode).toBe(404);
  });

  it("requires verification, records the reviewer, and invalidates verification on patch", async () => {
    const rejected = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/publish`,
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json()).toMatchObject({
      data: null,
      error: { code: "VALIDATION_ERROR" },
    });

    const verified = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/verify`,
    });
    expect(verified.statusCode).toBe(200);
    expect(verified.json().data).toMatchObject({
      lastVerifiedAt: expect.any(String),
      verified: true,
      verifiedAt: expect.any(String),
      verifiedBy: "user_admin_reviewer",
    });
    const firstVerifiedAt = verified.json().data.verifiedAt;

    const verifiedAgain = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/verify`,
    });
    expect(verifiedAgain.statusCode).toBe(200);
    expect(verifiedAgain.json().data.verifiedAt).toBe(firstVerifiedAt);

    const updated = await app.inject({
      headers: adminHeaders,
      method: "PATCH",
      payload: {
        mainProducts: [{ en: "Smart LED bulbs", zh: "智能 LED 灯泡" }],
        name: { en: "Reviewed Lighting Factory", zh: "已复核照明工厂" },
      },
      url: `/api/v1/admin/factories/${ids.factory}`,
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data).toMatchObject({
      lastVerifiedAt: expect.any(String),
      verified: false,
      verifiedAt: firstVerifiedAt,
      verifiedBy: "user_admin_reviewer",
    });
    const searchText = await pool.query<{ search_text_en: string }>(
      `select search_text_en from factories where id = $1`,
      [ids.factory],
    );
    expect(searchText.rows[0]?.search_text_en).toContain(
      "Reviewed Lighting Factory Smart LED bulbs Lighting lamps",
    );
  });

  it("persists state before purge failure and converges on retry", async () => {
    await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/verify`,
    });
    const published = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/publish`,
    });
    expect(published.statusCode).toBe(200);
    const firstPublishedAt = published.json().data.publishedAt;

    const visible = await app.inject({
      method: "GET",
      url: "/api/v1/factories/admin-factory-0",
    });
    expect(visible.statusCode).toBe(200);

    purge.mockRejectedValueOnce(new Error("provider secret"));
    const failed = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/unpublish`,
    });
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toMatchObject({
      data: null,
      error: { code: "INTERNAL", message: "Internal server error" },
    });

    const persisted = await pool.query<{
      published_at: Date;
      status: string;
    }>(`select status, published_at from factories where id = $1`, [
      ids.factory,
    ]);
    expect(persisted.rows[0]).toMatchObject({
      status: "draft",
    });
    expect(persisted.rows[0]?.published_at.toISOString()).toBe(
      firstPublishedAt,
    );

    const retry = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/unpublish`,
    });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().data).toMatchObject({
      publishedAt: firstPublishedAt,
      status: "draft",
    });

    const hidden = await app.inject({
      method: "GET",
      url: "/api/v1/factories/admin-factory-0",
    });
    expect(hidden.statusCode).toBe(404);
  });
});

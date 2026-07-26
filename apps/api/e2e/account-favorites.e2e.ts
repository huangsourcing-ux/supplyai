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

import {
  CLERK_USER_DELETER,
  type ClerkUserDeleter,
} from "../src/account/clerk-user-deleter.js";
import { AppModule } from "../src/app.module.js";
import {
  CLERK_TOKEN_VERIFIER,
  type ClerkTokenVerifier,
} from "../src/auth/admin-auth.guard.js";
import { registerEdgeProxy } from "../src/common/http/edge-proxy.js";
import { configureHttpApplication } from "../src/http-application.js";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const postgresPort = 5432;
const redisPort = 6379;
const credentials = {
  database: "chinasupply_account_favorites_e2e",
  password: "chinasupply_account_favorites_e2e_only",
  user: "chinasupply",
};
const ids = {
  category: "aaaaaaaaaaaaaaaaaaaaa",
  clusterDraft: "ddddddddddddddddddddd",
  clusterPublished: "ccccccccccccccccccccc",
  dangling: "hhhhhhhhhhhhhhhhhhhhh",
  factoryDraft: "fffffffffffffffffffff",
  factoryPublished: "eeeeeeeeeeeeeeeeeeeee",
  favoriteFour: "444444444444444444444",
  favoriteOne: "111111111111111111111",
  favoriteThree: "333333333333333333333",
  favoriteTwo: "222222222222222222222",
  region: "bbbbbbbbbbbbbbbbbbbbb",
} as const;
const users = {
  deleted: "user_deleted",
  deleteFailure: "user_delete_failure",
  deleteSuccess: "user_delete_success",
  one: "user_one",
  rate: "user_rate",
  rateOther: "user_rate_other",
  target: "user_target_validation",
  two: "user_two",
} as const;

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
     values ($1, 'city', $2::jsonb, ST_SetSRID(ST_MakePoint(113.75, 23.04), 4326))`,
    [ids.region, JSON.stringify({ en: "Dongguan", zh: "东莞" })],
  );
  await pool.query(
    `insert into categories
       (id, name, slug, icon, color, aliases, sort_order, search_text_en, search_text_zh)
     values ($1, $2::jsonb, 'electronics', 'chip', '#112233', '{}'::jsonb, 1,
             'electronics', '电子')`,
    [ids.category, JSON.stringify({ en: "Electronics", zh: "电子" })],
  );
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into clusters
       (id, slug, name, region_id, primary_category_id, centroid, summary,
        main_products, status, published_at, search_text_en, search_text_zh)
     values
       ($1, 'published-cluster', $3::jsonb, $5, $6,
        ST_SetSRID(ST_MakePoint(113.75, 23.04), 4326), $7::jsonb, $8::jsonb,
        'published', '2026-07-25T12:00:00.000Z', 'published electronics', '已发布电子'),
       ($2, 'draft-cluster', $4::jsonb, $5, $6,
        ST_SetSRID(ST_MakePoint(113.76, 23.05), 4326), $7::jsonb, $8::jsonb,
        'draft', null, 'draft electronics', '草稿电子')`,
      [
        ids.clusterPublished,
        ids.clusterDraft,
        JSON.stringify({ en: "Published Cluster", zh: "已发布产业带" }),
        JSON.stringify({ en: "Draft Cluster", zh: "草稿产业带" }),
        ids.region,
        ids.category,
        JSON.stringify({ en: "Electronics cluster", zh: "电子产业带" }),
        JSON.stringify([{ en: "Circuit boards", zh: "电路板" }]),
      ],
    );
    await client.query(
      `insert into cluster_categories (cluster_id, category_id)
       values ($1, $3), ($2, $3)`,
      [ids.clusterPublished, ids.clusterDraft, ids.category],
    );
    await client.query(
      `insert into factories
       (id, slug, name, cluster_id, region_id, address, location, main_products,
        verified, status, published_at, search_text_en, search_text_zh)
     values
       ($1, 'published-factory', $3::jsonb, $5, $6, $7::jsonb,
        ST_SetSRID(ST_MakePoint(113.77, 23.06), 4326), $8::jsonb,
        true, 'published', '2026-07-25T13:00:00.000Z', 'published factory', '已发布工厂'),
       ($2, 'draft-factory', $4::jsonb, $5, $6, $7::jsonb,
        ST_SetSRID(ST_MakePoint(113.78, 23.07), 4326), $8::jsonb,
        false, 'draft', null, 'draft factory', '草稿工厂')`,
      [
        ids.factoryPublished,
        ids.factoryDraft,
        JSON.stringify({ en: "Published Factory", zh: "已发布工厂" }),
        JSON.stringify({ en: "Draft Factory", zh: "草稿工厂" }),
        ids.clusterPublished,
        ids.region,
        JSON.stringify({ en: "Dongguan", zh: "东莞" }),
        JSON.stringify([{ en: "Circuit boards", zh: "电路板" }]),
      ],
    );
    await client.query(
      `insert into factory_categories (factory_id, category_id)
       values ($1, $3), ($2, $3)`,
      [ids.factoryPublished, ids.factoryDraft, ids.category],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  for (const userId of Object.values(users)) {
    await pool.query(
      `insert into users (id, email, name, locale, deleted_at)
       values ($1, $2, $3, 'en', $4)`,
      [
        userId,
        `${userId}@example.test`,
        userId,
        userId === users.deleted ? new Date("2026-07-26T10:00:00.000Z") : null,
      ],
    );
  }

  await pool.query(
    `insert into favorites (id, user_id, target_type, target_id, created_at)
     values
       ($1, $5, 'cluster', $9, '2026-07-26T12:00:00.000Z'),
       ($2, $5, 'factory', $10, '2026-07-26T12:00:00.000Z'),
       ($3, $5, 'cluster', $11, '2026-07-26T12:00:00.000Z'),
       ($4, $5, 'cluster', $12, '2026-07-26T12:00:00.000Z'),
       ('555555555555555555555', $6, 'factory', $10, '2026-07-26T11:00:00.000Z'),
       ('666666666666666666666', $7, 'factory', $10, '2026-07-26T11:00:00.000Z'),
       ('777777777777777777777', $8, 'factory', $10, '2026-07-26T11:00:00.000Z')`,
    [
      ids.favoriteOne,
      ids.favoriteTwo,
      ids.favoriteThree,
      ids.favoriteFour,
      users.one,
      users.two,
      users.deleteSuccess,
      users.deleteFailure,
      ids.clusterPublished,
      ids.factoryPublished,
      ids.clusterDraft,
      ids.dangling,
    ],
  );
}

function authorization(userId: string) {
  return { authorization: `Bearer token-${userId}` };
}

describe.sequential("M3-T4 account and favorites API e2e", () => {
  let app: NestFastifyApplication;
  let pool: Pool;
  let postgres: StartedTestContainer;
  let redis: StartedTestContainer;
  const previousEnvironment = { ...process.env };
  const deleteClerkUser = vi.fn<ClerkUserDeleter>(async (userId) => {
    if (userId === users.deleteFailure) {
      throw new Error("private Clerk failure");
    }
  });

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
        .withStartupTimeout(60_000)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
        .start(),
    ]);
    const databaseUrl = `postgresql://${credentials.user}:${credentials.password}@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/${credentials.database}`;
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
      if (!token.startsWith("token-")) {
        throw new Error("invalid token");
      }
      return { sub: token.slice("token-".length) };
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLERK_TOKEN_VERIFIER)
      .useValue(tokenVerifier)
      .overrideProvider(CLERK_USER_DELETER)
      .useValue(deleteClerkUser)
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

  it("requires an active synchronized Clerk user", async () => {
    const missing = await app.inject({
      method: "GET",
      url: "/api/v1/favorites",
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.json()).toMatchObject({
      data: null,
      error: { code: "UNAUTHORIZED" },
    });

    for (const userId of ["user_unsynchronized", users.deleted]) {
      const response = await app.inject({
        headers: authorization(userId),
        method: "GET",
        url: "/api/v1/favorites",
      });
      expect(response.statusCode).toBe(401);
    }
  });

  it("paginates by createdAt and id without leaking unavailable targets", async () => {
    const first = await app.inject({
      headers: authorization(users.one),
      method: "GET",
      url: "/api/v1/favorites?limit=2",
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json<{
      data: { id: string; target: unknown }[];
      meta: { nextCursor: string | null };
    }>();
    expect(firstBody.data).toEqual([
      expect.objectContaining({ id: ids.favoriteFour, target: null }),
      expect.objectContaining({ id: ids.favoriteThree, target: null }),
    ]);
    expect(firstBody.meta.nextCursor).not.toBeNull();

    const second = await app.inject({
      headers: authorization(users.one),
      method: "GET",
      url: `/api/v1/favorites?limit=2&cursor=${encodeURIComponent(firstBody.meta.nextCursor as string)}`,
    });
    expect(second.statusCode).toBe(200);
    const secondBody = second.json<{
      data: { id: string; target: { id: string } | null }[];
      meta: { nextCursor: string | null };
    }>();
    expect(secondBody.data).toEqual([
      expect.objectContaining({
        id: ids.favoriteTwo,
        target: expect.objectContaining({ id: ids.factoryPublished }),
      }),
      expect.objectContaining({
        id: ids.favoriteOne,
        target: expect.objectContaining({ id: ids.clusterPublished }),
      }),
    ]);
    expect(secondBody.meta.nextCursor).toBeNull();
    expect(
      new Set([...firstBody.data, ...secondBody.data].map((item) => item.id)),
    ).toHaveLength(4);

    const invalid = await app.inject({
      headers: authorization(users.one),
      method: "GET",
      url: "/api/v1/favorites?cursor=not-a-cursor",
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", details: expect.any(Array) },
    });
  });

  it("creates one record under concurrent repeated requests", async () => {
    const request = {
      headers: authorization(users.two),
      method: "POST" as const,
      payload: {
        targetId: ids.clusterPublished,
        targetType: "cluster",
      },
      url: "/api/v1/favorites",
    };
    const responses = await Promise.all([
      app.inject(request),
      app.inject(request),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([
      200, 200,
    ]);
    const records = responses.map(
      (response) =>
        response.json<{ data: { id: string; target: { id: string } } }>().data,
    );
    expect(records[0]?.id).toBe(records[1]?.id);
    expect(records[0]?.target.id).toBe(ids.clusterPublished);
    const count = await pool.query<{ count: number }>(
      `select count(*)::integer as count from favorites
       where user_id = $1 and target_type = 'cluster' and target_id = $2`,
      [users.two, ids.clusterPublished],
    );
    expect(count.rows[0]?.count).toBe(1);

    await pool.query(
      "update clusters set status = 'draft', published_at = null where id = $1",
      [ids.clusterPublished],
    );
    const afterUnpublish = await app.inject(request);
    expect(afterUnpublish.statusCode).toBe(200);
    expect(afterUnpublish.json()).toMatchObject({
      data: { id: records[0]?.id, target: null },
    });
  });

  it("returns the same 404 for a draft or nonexistent first target", async () => {
    for (const targetId of [ids.clusterDraft, "zzzzzzzzzzzzzzzzzzzzz"]) {
      const response = await app.inject({
        headers: authorization(users.target),
        method: "POST",
        payload: { targetId, targetType: "cluster" },
        url: "/api/v1/favorites",
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        data: null,
        error: { code: "NOT_FOUND" },
      });
    }
    const count = await pool.query<{ count: number }>(
      "select count(*)::integer as count from favorites where user_id = $1",
      [users.target],
    );
    expect(count.rows[0]?.count).toBe(0);
  });

  it("deletes idempotently without affecting another user", async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await app.inject({
        headers: authorization(users.one),
        method: "DELETE",
        url: `/api/v1/favorites/factory/${ids.factoryPublished}`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        data: {
          absent: true,
          targetId: ids.factoryPublished,
          targetType: "factory",
        },
      });
    }
    const remaining = await pool.query<{ user_id: string }>(
      `select user_id from favorites
       where target_type = 'factory' and target_id = $1 order by user_id`,
      [ids.factoryPublished],
    );
    expect(remaining.rows.map((row) => row.user_id)).toContain(users.two);
    expect(remaining.rows.map((row) => row.user_id)).not.toContain(users.one);
  });

  it("patches only the current local account with Zod validation", async () => {
    const updated = await app.inject({
      headers: authorization(users.one),
      method: "PATCH",
      payload: { locale: "en", name: null },
      url: "/api/v1/me",
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      data: {
        email: `${users.one}@example.test`,
        id: users.one,
        locale: "en",
        name: null,
      },
    });

    for (const payload of [
      {},
      { locale: "zh" },
      { name: " " },
      { extra: true },
    ]) {
      const invalid = await app.inject({
        headers: authorization(users.one),
        method: "PATCH",
        payload,
        url: "/api/v1/me",
      });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toMatchObject({
        data: null,
        error: { code: "VALIDATION_ERROR", details: expect.any(Array) },
      });
    }
  });

  it("requests Clerk deletion while leaving local cleanup to the webhook", async () => {
    const response = await app.inject({
      headers: authorization(users.deleteSuccess),
      method: "DELETE",
      url: "/api/v1/me",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: { deletionRequested: true },
    });
    expect(deleteClerkUser).toHaveBeenCalledWith(users.deleteSuccess);
    const local = await pool.query<{
      deleted_at: Date | null;
      favorite_count: number;
    }>(
      `select u.deleted_at, count(f.id)::integer as favorite_count
       from users u left join favorites f on f.user_id = u.id
       where u.id = $1 group by u.id`,
      [users.deleteSuccess],
    );
    expect(local.rows[0]).toMatchObject({
      deleted_at: null,
      favorite_count: 1,
    });
  });

  it("returns 503 without local side effects when Clerk deletion fails", async () => {
    const response = await app.inject({
      headers: authorization(users.deleteFailure),
      method: "DELETE",
      url: "/api/v1/me",
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      data: null,
      error: { code: "INTERNAL", message: "Service unavailable" },
    });
    const local = await pool.query<{
      deleted_at: Date | null;
      favorite_count: number;
    }>(
      `select u.deleted_at, count(f.id)::integer as favorite_count
       from users u left join favorites f on f.user_id = u.id
       where u.id = $1 group by u.id`,
      [users.deleteFailure],
    );
    expect(local.rows[0]).toMatchObject({
      deleted_at: null,
      favorite_count: 1,
    });
  });

  it("limits writes to 60 per minute per user and route", async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await app.inject({
        headers: authorization(users.rate),
        method: "PATCH",
        payload: { locale: "en" },
        url: "/api/v1/me",
      });
      expect(response.statusCode).toBe(200);
    }
    const blocked = await app.inject({
      headers: authorization(users.rate),
      method: "PATCH",
      payload: { locale: "en" },
      url: "/api/v1/me",
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toMatchObject({
      error: { code: "RATE_LIMITED" },
    });

    const read = await app.inject({
      headers: authorization(users.rate),
      method: "GET",
      url: "/api/v1/favorites",
    });
    expect(read.statusCode).toBe(200);

    const otherRoute = await app.inject({
      headers: authorization(users.rate),
      method: "POST",
      payload: {
        targetId: ids.factoryPublished,
        targetType: "factory",
      },
      url: "/api/v1/favorites",
    });
    expect(otherRoute.statusCode).toBe(200);

    const otherUser = await app.inject({
      headers: authorization(users.rateOther),
      method: "PATCH",
      payload: { locale: "en" },
      url: "/api/v1/me",
    });
    expect(otherUser.statusCode).toBe(200);
  });
});

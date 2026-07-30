import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { MAX_UPLOAD_BYTES } from "@chinasupply/schemas";
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
const minioPort = 9000;
const minioImage = "minio/minio:RELEASE.2025-04-22T22-12-26Z";
const mediaBucket = "chinasupply-admin-e2e-media";
const minioCredentials = {
  accessKeyId: "chinasupply-minio-admin",
  secretAccessKey: "chinasupply-minio-admin-secret",
};
const credentials = {
  database: "chinasupply_admin_e2e",
  password: "chinasupply_admin_e2e_only",
  user: "chinasupply",
};
const ids = {
  category: "catadmin0000000000000",
  categoryChild: "catadminchild00000000",
  cluster: "clusteradmin000000000",
  clusterSecond: "clusteradmin000000001",
  factory: "factoryadmin000000000",
  factorySecond: "factoryadmin000000001",
  region: "regionadmin0000000000",
} as const;
const adminHeaders = {
  authorization: "Bearer admin-token",
  host: "api-staging.chinasupply.ai",
  "x-forwarded-proto": "https",
};
const validWebp = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==",
  "base64",
);

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
  await pool.query(
    `insert into categories
       (id, parent_id, name, slug, aliases, search_text_en, search_text_zh)
     values ($1, $2, $3::jsonb, 'admin-led-bulbs', '{}'::jsonb, 'led bulbs', 'LED 灯泡')`,
    [
      ids.categoryChild,
      ids.category,
      JSON.stringify({ en: "LED Bulbs", zh: "LED 灯泡" }),
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
  let minio: StartedTestContainer;
  let databaseUrl: string;
  let pool: Pool;
  let app: NestFastifyApplication;
  let mediaClient: S3Client;
  let mediaEndpoint: string;
  let mediaBaseUrl: string;
  let createdClusterId: string;
  let createdFactoryId: string;
  const purge = vi.fn<(origin: string) => Promise<void>>();
  const previousEnvironment = { ...process.env };

  async function presign(input: {
    contentLength?: number;
    contentType?: "image/jpeg" | "image/png" | "image/webp";
    entityId: string;
    fileName?: string;
    kind: "cluster-cover" | "factory-image";
  }) {
    return app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: {
        contentLength: input.contentLength ?? validWebp.length,
        contentType: input.contentType ?? "image/webp",
        entityId: input.entityId,
        fileName: input.fileName ?? "authorized.webp",
        kind: input.kind,
      },
      url: "/api/v1/admin/uploads/presign",
    });
  }

  beforeAll(async () => {
    [postgres, redis, minio] = await Promise.all([
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
      new GenericContainer(minioImage)
        .withCommand(["server", "/data"])
        .withEnvironment({
          MINIO_ROOT_PASSWORD: minioCredentials.secretAccessKey,
          MINIO_ROOT_USER: minioCredentials.accessKeyId,
        })
        .withExposedPorts(minioPort)
        .withStartupTimeout(120_000)
        .withWaitStrategy(
          Wait.forHttp("/minio/health/ready", minioPort).forStatusCode(200),
        )
        .start(),
    ]);

    databaseUrl = `postgresql://${credentials.user}:${credentials.password}@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/${credentials.database}`;
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(redisPort)}`;
    mediaEndpoint = `http://${minio.getHost()}:${minio.getMappedPort(minioPort)}`;
    mediaBaseUrl = `${mediaEndpoint}/${mediaBucket}`;
    mediaClient = new S3Client({
      credentials: minioCredentials,
      endpoint: mediaEndpoint,
      forcePathStyle: true,
      region: "auto",
    });
    await mediaClient.send(new CreateBucketCommand({ Bucket: mediaBucket }));
    await mediaClient.send(
      new PutBucketPolicyCommand({
        Bucket: mediaBucket,
        Policy: JSON.stringify({
          Statement: [
            {
              Action: ["s3:GetObject"],
              Effect: "Allow",
              Principal: "*",
              Resource: [`arn:aws:s3:::${mediaBucket}/*`],
            },
          ],
          Version: "2012-10-17",
        }),
      }),
    );
    runMigration(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    await seed(pool);

    Object.assign(process.env, {
      APP_ENV: "local",
      DATABASE_URL: databaseUrl,
      PORT: "3001",
      R2_ACCOUNT_ID: "local-minio-account",
      R2_ACCESS_KEY_ID: minioCredentials.accessKeyId,
      R2_CDN_BASE_URL: mediaBaseUrl,
      R2_ENDPOINT: mediaEndpoint,
      R2_MEDIA_BUCKET: mediaBucket,
      R2_PREFIX: "dev",
      R2_SECRET_ACCESS_KEY: minioCredentials.secretAccessKey,
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
    mediaClient?.destroy();
    await Promise.all([postgres?.stop(), redis?.stop(), minio?.stop()]);
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

  it("creates draft clusters and factories with generated IDs and search text", async () => {
    const clusterPayload = {
      categoryIds: [ids.category],
      centroid: { coordinates: [120.8, 30.8], type: "Point" },
      mainProducts: [{ en: "Created lamps", zh: "新建灯具" }],
      name: { en: "Created Lighting Cluster", zh: "新建照明产业带" },
      primaryCategoryId: ids.category,
      regionId: ids.region,
      slug: "admin-created-cluster",
      summary: { en: "Created cluster summary", zh: "新建产业带简介" },
    };
    const cluster = await app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: clusterPayload,
      url: "/api/v1/admin/clusters",
    });
    expect(cluster.statusCode).toBe(200);
    expect(cluster.json()).toMatchObject({
      data: {
        boundary: null,
        categoryIds: [ids.category],
        coverImage: null,
        description: null,
        id: expect.stringMatching(/^[A-Za-z0-9_-]{21}$/u),
        publishedAt: null,
        stats: null,
        status: "draft",
      },
      error: null,
      meta: {},
    });
    createdClusterId = cluster.json().data.id;

    const clusterSearch = await pool.query<{ search_text_en: string }>(
      `select search_text_en from clusters where id = $1`,
      [createdClusterId],
    );
    expect(clusterSearch.rows[0]?.search_text_en).toContain(
      "Created Lighting Cluster Created lamps Created cluster summary Lighting lamps",
    );

    const factoryPayload = {
      address: { en: "88 Created Road", zh: "新建路 88 号" },
      categoryIds: [ids.category],
      clusterId: createdClusterId,
      location: { coordinates: [120.81, 30.81], type: "Point" },
      mainProducts: [{ en: "Created bulbs", zh: "新建灯泡" }],
      name: { en: "Created Lighting Factory", zh: "新建照明工厂" },
      regionId: ids.region,
      slug: "admin-created-factory",
    };
    const factory = await app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: factoryPayload,
      url: "/api/v1/admin/factories",
    });
    expect(factory.statusCode).toBe(200);
    expect(factory.json()).toMatchObject({
      data: {
        categoryIds: [ids.category],
        certifications: [],
        clusterId: createdClusterId,
        contact: null,
        id: expect.stringMatching(/^[A-Za-z0-9_-]{21}$/u),
        images: [],
        publishedAt: null,
        status: "draft",
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
      },
      error: null,
      meta: {},
    });
    createdFactoryId = factory.json().data.id;

    const factorySearch = await pool.query<{ search_text_en: string }>(
      `select search_text_en from factories where id = $1`,
      [createdFactoryId],
    );
    expect(factorySearch.rows[0]?.search_text_en).toContain(
      "Created Lighting Factory Created bulbs Lighting lamps",
    );
  });

  it("rejects invalid Create references, media, and duplicate slugs", async () => {
    const duplicate = await app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: {
        categoryIds: [ids.category],
        centroid: { coordinates: [120.8, 30.8], type: "Point" },
        mainProducts: [{ en: "Lamps", zh: "灯具" }],
        name: { en: "Duplicate Cluster", zh: "重复产业带" },
        primaryCategoryId: ids.category,
        regionId: ids.region,
        slug: "admin-created-cluster",
        summary: { en: "Duplicate", zh: "重复" },
      },
      url: "/api/v1/admin/clusters",
    });
    expect(duplicate.statusCode).toBe(400);
    expect(duplicate.json()).toMatchObject({
      data: null,
      error: { code: "VALIDATION_ERROR" },
    });

    const childPrimary = await app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: {
        categoryIds: [ids.categoryChild],
        centroid: { coordinates: [120.8, 30.8], type: "Point" },
        mainProducts: [{ en: "Bulbs", zh: "灯泡" }],
        name: { en: "Child Primary Cluster", zh: "二级主类目产业带" },
        primaryCategoryId: ids.categoryChild,
        regionId: ids.region,
        slug: "child-primary-cluster",
        summary: { en: "Invalid primary", zh: "无效主类目" },
      },
      url: "/api/v1/admin/clusters",
    });
    expect(childPrimary.statusCode).toBe(400);

    const unknownRegion = await app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: {
        address: { en: "Unknown", zh: "未知" },
        categoryIds: [ids.category],
        location: { coordinates: [120.81, 30.81], type: "Point" },
        mainProducts: [{ en: "Bulbs", zh: "灯泡" }],
        name: { en: "Unknown Region Factory", zh: "未知地区工厂" },
        regionId: "missingadmin000000000",
        slug: "unknown-region-factory",
      },
      url: "/api/v1/admin/factories",
    });
    expect(unknownRegion.statusCode).toBe(400);

    const clusterWithMedia = await app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: {
        categoryIds: [ids.category],
        centroid: { coordinates: [120.8, 30.8], type: "Point" },
        coverImageObjectKey: "dev/clusters/precreated/cover.webp",
        mainProducts: [{ en: "Lamps", zh: "灯具" }],
        name: { en: "Premature Media Cluster", zh: "提前图片产业带" },
        primaryCategoryId: ids.category,
        regionId: ids.region,
        slug: "premature-media-cluster",
        summary: { en: "Media", zh: "图片" },
      },
      url: "/api/v1/admin/clusters",
    });
    expect(clusterWithMedia.statusCode).toBe(400);

    const factoryWithMedia = await app.inject({
      headers: adminHeaders,
      method: "POST",
      payload: {
        address: { en: "Media", zh: "图片" },
        categoryIds: [ids.category],
        images: [
          {
            alt: { en: "Premature", zh: "提前" },
            objectKey: "dev/factories/precreated/image.webp",
          },
        ],
        location: { coordinates: [120.81, 30.81], type: "Point" },
        mainProducts: [{ en: "Bulbs", zh: "灯泡" }],
        name: { en: "Premature Media Factory", zh: "提前图片工厂" },
        regionId: ids.region,
        slug: "premature-media-factory",
      },
      url: "/api/v1/admin/factories",
    });
    expect(factoryWithMedia.statusCode).toBe(400);

    const [clusterSlugConflict, factorySlugConflict] = await Promise.all([
      app.inject({
        headers: adminHeaders,
        method: "PATCH",
        payload: { slug: "admin-cluster-0" },
        url: `/api/v1/admin/clusters/${createdClusterId}`,
      }),
      app.inject({
        headers: adminHeaders,
        method: "PATCH",
        payload: { slug: "admin-factory-0" },
        url: `/api/v1/admin/factories/${createdFactoryId}`,
      }),
    ]);
    expect(clusterSlugConflict.statusCode).toBe(400);
    expect(factorySlugConflict.statusCode).toBe(400);
  });

  it("does not expose hard-delete routes", async () => {
    const [clusterDelete, factoryDelete] = await Promise.all([
      app.inject({
        headers: adminHeaders,
        method: "DELETE",
        url: `/api/v1/admin/clusters/${createdClusterId}`,
      }),
      app.inject({
        headers: adminHeaders,
        method: "DELETE",
        url: `/api/v1/admin/factories/${createdFactoryId}`,
      }),
    ]);
    expect(clusterDelete.statusCode).toBe(404);
    expect(factoryDelete.statusCode).toBe(404);
  });

  it("runs presign, PUT, HEAD validation, PATCH, and public CDN responses", async () => {
    const beforePresign = Date.now();
    const factoryPresign = await presign({
      entityId: createdFactoryId,
      kind: "factory-image",
    });
    const afterPresign = Date.now();
    expect(factoryPresign.statusCode).toBe(200);
    const factoryUpload = factoryPresign.json().data as {
      expiresAt: string;
      headers: { "Content-Type": string };
      method: string;
      objectKey: string;
      uploadUrl: string;
    };
    expect(factoryUpload).toMatchObject({
      headers: { "Content-Type": "image/webp" },
      method: "PUT",
      objectKey: expect.stringMatching(
        new RegExp(
          `^dev/factories/${createdFactoryId}/image-[A-Za-z0-9_-]{21}\\.webp$`,
          "u",
        ),
      ),
    });
    expect(
      new URL(factoryUpload.uploadUrl).searchParams.get("X-Amz-Expires"),
    ).toBe("300");
    const expiresAt = new Date(factoryUpload.expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(beforePresign + 300_000);
    expect(expiresAt).toBeLessThanOrEqual(afterPresign + 300_000);

    const putFactory = await fetch(factoryUpload.uploadUrl, {
      body: validWebp,
      headers: factoryUpload.headers,
      method: "PUT",
    });
    expect(putFactory.status).toBe(200);

    const patchFactory = await app.inject({
      headers: adminHeaders,
      method: "PATCH",
      payload: {
        images: [
          {
            alt: { en: "Factory exterior", zh: "工厂外观" },
            objectKey: factoryUpload.objectKey,
          },
        ],
      },
      url: `/api/v1/admin/factories/${createdFactoryId}`,
    });
    expect(patchFactory.statusCode).toBe(200);
    expect(patchFactory.json().data).toMatchObject({
      images: [
        {
          alt: { en: "Factory exterior", zh: "工厂外观" },
          objectKey: factoryUpload.objectKey,
          url: `${mediaBaseUrl}/${factoryUpload.objectKey}`,
        },
      ],
      verified: false,
    });

    const verified = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${createdFactoryId}/verify`,
    });
    expect(verified.statusCode).toBe(200);
    const publishedFactory = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${createdFactoryId}/publish`,
    });
    expect(publishedFactory.statusCode).toBe(200);

    const publicFactory = await app.inject({
      method: "GET",
      url: "/api/v1/factories/admin-created-factory",
    });
    expect(publicFactory.statusCode).toBe(200);
    expect(publicFactory.json().data.images).toEqual([
      {
        alt: "Factory exterior",
        url: `${mediaBaseUrl}/${factoryUpload.objectKey}`,
      },
    ]);
    expect(JSON.stringify(publicFactory.json())).not.toContain("objectKey");
    const fetchedFactoryImage = await fetch(
      publicFactory.json().data.images[0].url,
    );
    expect(fetchedFactoryImage.status).toBe(200);
    expect(fetchedFactoryImage.headers.get("content-type")).toBe("image/webp");

    const clusterPresign = await presign({
      contentType: "image/png",
      entityId: createdClusterId,
      fileName: "cover.png",
      kind: "cluster-cover",
    });
    expect(clusterPresign.statusCode).toBe(200);
    const clusterUpload = clusterPresign.json().data as {
      headers: { "Content-Type": string };
      objectKey: string;
      uploadUrl: string;
    };
    expect(clusterUpload.objectKey).toMatch(
      new RegExp(
        `^dev/clusters/${createdClusterId}/cover-[A-Za-z0-9_-]{21}\\.png$`,
        "u",
      ),
    );
    const putCluster = await fetch(clusterUpload.uploadUrl, {
      body: validWebp,
      headers: clusterUpload.headers,
      method: "PUT",
    });
    expect(putCluster.status).toBe(200);

    const patchCluster = await app.inject({
      headers: adminHeaders,
      method: "PATCH",
      payload: { coverImageObjectKey: clusterUpload.objectKey },
      url: `/api/v1/admin/clusters/${createdClusterId}`,
    });
    expect(patchCluster.statusCode).toBe(200);
    expect(patchCluster.json().data.coverImage).toEqual({
      objectKey: clusterUpload.objectKey,
      url: `${mediaBaseUrl}/${clusterUpload.objectKey}`,
    });
    const publishedCluster = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/clusters/${createdClusterId}/publish`,
    });
    expect(publishedCluster.statusCode).toBe(200);
    const publicCluster = await app.inject({
      method: "GET",
      url: "/api/v1/clusters/admin-created-cluster",
    });
    expect(publicCluster.statusCode).toBe(200);
    expect(publicCluster.json().data.coverImageUrl).toBe(
      `${mediaBaseUrl}/${clusterUpload.objectKey}`,
    );
    expect(JSON.stringify(publicCluster.json())).not.toContain("objectKey");
  });

  it("rejects unsafe presigns and invalid uploaded object metadata", async () => {
    const unknown = await presign({
      entityId: "missingadmin000000000",
      kind: "factory-image",
    });
    expect(unknown.statusCode).toBe(404);

    const oversizedDeclaration = await presign({
      contentLength: MAX_UPLOAD_BYTES + 1,
      entityId: createdFactoryId,
      kind: "factory-image",
    });
    expect(oversizedDeclaration.statusCode).toBe(400);

    const wrongSignedType = await presign({
      entityId: createdFactoryId,
      kind: "factory-image",
    });
    const wrongSignedPut = await fetch(wrongSignedType.json().data.uploadUrl, {
      body: validWebp,
      headers: { "Content-Type": "image/png" },
      method: "PUT",
    });
    expect(wrongSignedPut.status).toBe(403);

    const missing = await presign({
      entityId: createdFactoryId,
      kind: "factory-image",
    });
    const missingPatch = await app.inject({
      headers: adminHeaders,
      method: "PATCH",
      payload: {
        images: [
          {
            alt: { en: "Missing", zh: "缺失" },
            objectKey: missing.json().data.objectKey,
          },
        ],
      },
      url: `/api/v1/admin/factories/${createdFactoryId}`,
    });
    expect(missingPatch.statusCode).toBe(400);

    const crossEntity = await app.inject({
      headers: adminHeaders,
      method: "PATCH",
      payload: {
        images: [
          {
            alt: { en: "Cross entity", zh: "跨实体" },
            objectKey: wrongSignedType.json().data.objectKey,
          },
        ],
      },
      url: `/api/v1/admin/factories/${ids.factory}`,
    });
    expect(crossEntity.statusCode).toBe(400);

    for (const invalid of [
      {
        body: Buffer.alloc(0),
        contentType: "image/png",
        expectedExtension: "png",
      },
      {
        body: validWebp,
        contentType: "application/pdf",
        expectedExtension: "png",
      },
      {
        body: validWebp,
        contentType: "image/jpeg",
        expectedExtension: "png",
      },
      {
        body: Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1),
        contentType: "image/png",
        expectedExtension: "png",
      },
    ]) {
      const invalidPresign = await presign({
        contentType: "image/png",
        entityId: createdFactoryId,
        fileName: `invalid.${invalid.expectedExtension}`,
        kind: "factory-image",
      });
      const objectKey = invalidPresign.json().data.objectKey as string;
      await mediaClient.send(
        new PutObjectCommand({
          Body: invalid.body,
          Bucket: mediaBucket,
          ContentType: invalid.contentType,
          Key: objectKey,
        }),
      );
      const rejected = await app.inject({
        headers: adminHeaders,
        method: "PATCH",
        payload: {
          images: [
            {
              alt: { en: "Invalid", zh: "无效" },
              objectKey,
            },
          ],
        },
        url: `/api/v1/admin/factories/${createdFactoryId}`,
      });
      expect(rejected.statusCode).toBe(400);
      expect(rejected.json()).toMatchObject({
        data: null,
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const unchanged = await app.inject({
      headers: adminHeaders,
      method: "GET",
      url: `/api/v1/admin/factories/${createdFactoryId}`,
    });
    expect(unchanged.statusCode).toBe(200);
    expect(unchanged.json().data).toMatchObject({ verified: true });

    const [unpublishedFactory, unpublishedCluster] = await Promise.all([
      app.inject({
        headers: adminHeaders,
        method: "POST",
        url: `/api/v1/admin/factories/${createdFactoryId}/unpublish`,
      }),
      app.inject({
        headers: adminHeaders,
        method: "POST",
        url: `/api/v1/admin/clusters/${createdClusterId}/unpublish`,
      }),
    ]);
    expect(unpublishedFactory.statusCode).toBe(200);
    expect(unpublishedCluster.statusCode).toBe(200);
    const invalidated = await app.inject({
      headers: adminHeaders,
      method: "PATCH",
      payload: { moq: "Smoke complete" },
      url: `/api/v1/admin/factories/${createdFactoryId}`,
    });
    expect(invalidated.statusCode).toBe(200);
    expect(invalidated.json().data).toMatchObject({
      status: "draft",
      verified: false,
    });
  }, 30_000);

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
    expect(purge).toHaveBeenLastCalledWith(
      "https://api-staging.chinasupply.ai",
    );

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

    const staleVerifiedAt = "2026-01-01T00:00:00.000Z";
    await pool.query(
      `update factories
       set verified = false,
           verified_at = $2,
           last_verified_at = $2
       where id = $1`,
      [ids.factory, staleVerifiedAt],
    );

    const reverifiedAfterLegacyInvalidation = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/verify`,
    });
    expect(reverifiedAfterLegacyInvalidation.statusCode).toBe(200);
    expect(reverifiedAfterLegacyInvalidation.json().data.verifiedAt).not.toBe(
      staleVerifiedAt,
    );
    expect(reverifiedAfterLegacyInvalidation.json().data.lastVerifiedAt).toBe(
      reverifiedAfterLegacyInvalidation.json().data.verifiedAt,
    );
    expect(reverifiedAfterLegacyInvalidation.json().data.verifiedBy).toBe(
      "user_admin_reviewer",
    );

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
      lastVerifiedAt: null,
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
    });
    const searchText = await pool.query<{ search_text_en: string }>(
      `select search_text_en from factories where id = $1`,
      [ids.factory],
    );
    expect(searchText.rows[0]?.search_text_en).toContain(
      "Reviewed Lighting Factory Smart LED bulbs Lighting lamps",
    );

    const reverified = await app.inject({
      headers: adminHeaders,
      method: "POST",
      url: `/api/v1/admin/factories/${ids.factory}/verify`,
    });
    expect(reverified.statusCode).toBe(200);
    expect(reverified.json().data).toMatchObject({
      lastVerifiedAt: expect.any(String),
      verified: true,
      verifiedAt: expect.any(String),
      verifiedBy: "user_admin_reviewer",
    });
    expect(reverified.json().data.verifiedAt).not.toBe(firstVerifiedAt);
    expect(reverified.json().data.lastVerifiedAt).toBe(
      reverified.json().data.verifiedAt,
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

  it("rate limits Admin writes by administrator ID", async () => {
    let limited;
    for (let attempt = 0; attempt < 70; attempt += 1) {
      const response = await presign({
        entityId: createdFactoryId,
        kind: "factory-image",
      });
      if (response.statusCode === 429) {
        limited = response;
        break;
      }
      expect(response.statusCode).toBe(200);
    }

    expect(limited?.statusCode).toBe(429);
    expect(limited?.json()).toMatchObject({
      data: null,
      error: { code: "RATE_LIMITED" },
    });
    expect(limited?.headers["x-ratelimit-limit"]).toBe("60");
    expect(limited?.headers["x-ratelimit-remaining"]).toBe("0");
  });
});

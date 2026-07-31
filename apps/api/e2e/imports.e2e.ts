import "reflect-metadata";

import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CreateBucketCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NestFactory } from "@nestjs/core";
import {
  geocodeFactoriesJobResultSchema,
  geocodeFactoriesReportSchema,
  importJobResultSchema,
  importReportSchema,
} from "@chinasupply/schemas";
import { Job, Queue, QueueEvents } from "bullmq";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { runGeocodeFactoriesCli } from "../scripts/run-geocode-factories-cli.js";
import { runImportCli } from "../scripts/run-import-cli.js";
import { createRedisOptions } from "../src/common/redis/redis-options.js";
import { IMPORT_QUEUE } from "../src/imports/import.constants.js";
import { loadRealSeedData } from "../src/seeds/real-seed-data.js";
import { runRealSeed } from "../src/seeds/seed-real.js";
import { WorkerModule } from "../src/worker.module.js";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const regionId = "region000000000000000";
const invalidRegionId = "missing00000000000000";
const categoryId = "category0000000000000";
const minioAccessKey = "imports-e2e-access";
const minioSecretKey = "imports-e2e-secret-key";
const privateBucket = "imports-e2e-private";

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
    throw new Error(`${result.stdout}\n${result.stderr}`);
  }
}

function clusterRows() {
  return Array.from({ length: 100 }, (_, index) => ({
    slug: `cluster-${index.toString().padStart(3, "0")}`,
    name: { en: `Cluster ${index}`, zh: `产业带 ${index}` },
    regionId: index < 90 ? regionId : invalidRegionId,
    primaryCategorySlug: "lighting",
    categorySlugs: ["lighting"],
    centroid: [116.404 + index / 100_000, 39.915],
    boundary:
      index === 0
        ? {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [116.4, 39.91],
                  [116.41, 39.91],
                  [116.41, 39.92],
                  [116.4, 39.91],
                ],
              ],
            ],
          }
        : null,
    summary: { en: `Lighting makers ${index}`, zh: `照明制造商 ${index}` },
    description: null,
    mainProducts: [{ en: "LED lighting", zh: "LED 照明" }],
    coverImage: null,
    stats: null,
  }));
}

function factoryRows() {
  return Array.from({ length: 100 }, (_, index) => ({
    slug: `factory-${index.toString().padStart(3, "0")}`,
    name: { en: `Factory ${index}`, zh: `工厂 ${index}` },
    clusterSlug: "cluster-000",
    regionId: index < 90 ? regionId : invalidRegionId,
    address: { en: `Beijing ${index}`, zh: `北京 ${index}` },
    location: [116.404 + index / 100_000, 39.915],
    categorySlugs: ["lighting"],
    mainProducts: [{ en: "LED lighting", zh: "LED 照明" }],
    certifications: ["ISO9001"],
    moq: null,
    establishedYear: 2012,
    employeeRange: "100-500",
    contact: null,
    images: [],
    sourceName: "e2e",
    sourceUrl: null,
  }));
}

describe.sequential("M1-T7 and M5-T5 import pipelines", () => {
  let postgres: StartedTestContainer;
  let redis: StartedTestContainer;
  let minio: StartedTestContainer;
  let amapServer: Server;
  let databaseUrl: string;
  let redisUrl: string;
  let r2Endpoint: string;
  let pool: Pool;
  let objectStorage: S3Client;
  let queue: Queue;
  let events: QueueEvents;
  let worker: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>;
  let temporaryDirectory: string | undefined;
  const environmentBackup = new Map<string, string | undefined>();

  beforeAll(async () => {
    [postgres, redis, minio] = await Promise.all([
      new GenericContainer("postgis/postgis:17-3.5")
        .withPlatform("linux/amd64")
        .withEnvironment({
          POSTGRES_DB: "imports_e2e",
          POSTGRES_PASSWORD: "imports_e2e_password",
          POSTGRES_USER: "chinasupply",
        })
        .withExposedPorts(5432)
        .withWaitStrategy(
          Wait.forLogMessage(
            /database system is ready to accept connections/,
            2,
          ),
        )
        .start(),
      new GenericContainer("redis:7.4-alpine")
        .withExposedPorts(6379)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
        .start(),
      new GenericContainer("minio/minio:RELEASE.2025-04-22T22-12-26Z")
        .withEnvironment({
          MINIO_ROOT_USER: minioAccessKey,
          MINIO_ROOT_PASSWORD: minioSecretKey,
        })
        .withCommand(["server", "/data", "--console-address", ":9001"])
        .withExposedPorts(9000)
        .withWaitStrategy(Wait.forHttp("/minio/health/ready", 9000))
        .start(),
    ]);

    databaseUrl = `postgresql://chinasupply:imports_e2e_password@${postgres.getHost()}:${postgres.getMappedPort(5432)}/imports_e2e`;
    redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    r2Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    amapServer = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const address = url.searchParams.get("address") ?? "";
      const key = url.searchParams.get("key");
      let body: unknown;

      if (key !== "amap-e2e-web-service-key") {
        body = {
          status: "0",
          count: "0",
          info: "INVALID_USER_KEY",
          infocode: "10001",
          geocodes: [],
        };
      } else if (address.includes("无法匹配")) {
        body = {
          status: "1",
          count: "0",
          info: "OK",
          infocode: "10000",
          geocodes: [],
        };
      } else {
        const updated = address.includes("更新地址");
        body = {
          status: "1",
          count: "2",
          info: "OK",
          infocode: "10000",
          geocodes: [
            {
              formatted_address: address,
              level: "门牌号",
              location: updated
                ? "116.490881,39.999410"
                : "116.480881,39.989410",
            },
            {
              formatted_address: "北京市朝阳区",
              level: "区县",
              location: "116.443550,39.921900",
            },
          ],
        };
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    });
    await new Promise<void>((resolvePromise, rejectPromise) => {
      amapServer.once("error", rejectPromise);
      amapServer.listen(0, "127.0.0.1", resolvePromise);
    });
    const amapAddress = amapServer.address();
    if (amapAddress === null || typeof amapAddress === "string") {
      throw new Error("Could not start the fake Amap service");
    }
    const amapEndpoint = `http://127.0.0.1:${amapAddress.port}/v3/geocode/geo`;

    runMigration(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query(
      `insert into regions (id, level, name, centroid)
       values ($1, 'city', $2::jsonb, ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326))`,
      [regionId, JSON.stringify({ en: "Beijing", zh: "北京" })],
    );
    await pool.query(
      `insert into categories
        (id, name, slug, color, aliases, search_text_en, search_text_zh)
       values ($1, $2::jsonb, 'lighting', '#112233', $3::jsonb, 'lighting led', '照明 LED')`,
      [
        categoryId,
        JSON.stringify({ en: "Lighting", zh: "照明" }),
        JSON.stringify({ en: ["led"], zh: ["LED"] }),
      ],
    );

    objectStorage = new S3Client({
      region: "auto",
      endpoint: r2Endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: minioAccessKey,
        secretAccessKey: minioSecretKey,
      },
    });
    await objectStorage.send(
      new CreateBucketCommand({ Bucket: privateBucket }),
    );

    const environment = {
      APP_ENV: "local",
      PORT: "3001",
      DATABASE_URL: databaseUrl,
      REDIS_URL: redisUrl,
      WEB_ORIGIN: "http://localhost:3000",
      R2_CDN_BASE_URL: "http://localhost:9000",
      R2_ACCOUNT_ID: "local-account",
      R2_ACCESS_KEY_ID: minioAccessKey,
      R2_SECRET_ACCESS_KEY: minioSecretKey,
      R2_PRIVATE_BUCKET: privateBucket,
      R2_PREFIX: "dev",
      R2_ENDPOINT: r2Endpoint,
      AMAP_WEB_SERVICE_KEY: "amap-e2e-web-service-key",
      AMAP_GEOCODING_BASE_URL: amapEndpoint,
    };
    for (const [key, value] of Object.entries(environment)) {
      environmentBackup.set(key, process.env[key]);
      process.env[key] = value;
    }

    worker = await NestFactory.createApplicationContext(WorkerModule, {
      logger: false,
    });
    queue = new Queue(IMPORT_QUEUE, {
      connection: createRedisOptions(redisUrl, 1),
    });
    events = new QueueEvents(IMPORT_QUEUE, {
      connection: createRedisOptions(redisUrl, null),
    });
    await events.waitUntilReady();
    temporaryDirectory = await mkdtemp(join(tmpdir(), "imports-e2e-"));
  }, 180_000);

  afterAll(async () => {
    await Promise.allSettled([
      events?.close(),
      queue?.close(),
      worker?.close(),
      pool?.end(),
      new Promise<void>((resolvePromise) => {
        amapServer?.close(() => resolvePromise());
      }),
    ]);
    objectStorage?.destroy();
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
    await Promise.allSettled([minio?.stop(), redis?.stop(), postgres?.stop()]);
    for (const [key, value] of environmentBackup) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  async function enqueueWithCli(
    entity: "clusters" | "factories",
    rows: unknown[],
  ) {
    if (temporaryDirectory === undefined) {
      throw new Error("Temporary import directory is not initialized");
    }
    const filePath = join(temporaryDirectory, `${entity}-${Date.now()}.json`);
    await writeFile(
      filePath,
      `${JSON.stringify({ version: 1, rows })}\n`,
      "utf8",
    );
    let output = "";
    const log = vi.spyOn(console, "log").mockImplementation((value) => {
      output = String(value);
    });
    try {
      await runImportCli(entity, [
        filePath,
        "--source-coordinate-system",
        "gcj02",
      ]);
    } finally {
      log.mockRestore();
    }
    const cli = JSON.parse(output) as {
      jobId: string;
      reportObjectKey: string;
      sourceObjectKey: string;
    };
    const job = await queue.getJob(cli.jobId);
    expect(job).toBeInstanceOf(Job);
    let rawResult: unknown;
    try {
      rawResult = await job?.waitUntilFinished(events, 120_000);
    } catch (error) {
      const failedJob = await queue.getJob(cli.jobId);
      throw new Error(
        [
          error instanceof Error ? error.message : String(error),
          failedJob?.failedReason,
          ...(failedJob?.stacktrace ?? []),
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    const result = importJobResultSchema.parse(rawResult);
    const reportResponse = await objectStorage.send(
      new GetObjectCommand({
        Bucket: privateBucket,
        Key: cli.reportObjectKey,
      }),
    );
    const report = importReportSchema.parse(
      JSON.parse(await reportResponse.Body!.transformToString()),
    );
    return { cli, report, result };
  }

  async function enqueueGeocodeWithCli(rows: unknown[]) {
    if (temporaryDirectory === undefined) {
      throw new Error("Temporary import directory is not initialized");
    }
    const filePath = join(
      temporaryDirectory,
      `geocode-factories-${Date.now()}.json`,
    );
    await writeFile(
      filePath,
      `${JSON.stringify({ version: 1, rows })}\n`,
      "utf8",
    );
    let output = "";
    const log = vi.spyOn(console, "log").mockImplementation((value) => {
      output = String(value);
    });
    try {
      await runGeocodeFactoriesCli([filePath]);
    } finally {
      log.mockRestore();
    }
    const cli = JSON.parse(output) as {
      jobId: string;
      reportObjectKey: string;
      sourceObjectKey: string;
    };
    const job = await queue.getJob(cli.jobId);
    expect(job).toBeInstanceOf(Job);
    let rawResult: unknown;
    try {
      rawResult = await job?.waitUntilFinished(events, 120_000);
    } catch (error) {
      const failedJob = await queue.getJob(cli.jobId);
      throw new Error(
        [
          error instanceof Error ? error.message : String(error),
          failedJob?.failedReason,
          ...(failedJob?.stacktrace ?? []),
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    const result = geocodeFactoriesJobResultSchema.parse(rawResult);
    const reportResponse = await objectStorage.send(
      new GetObjectCommand({
        Bucket: privateBucket,
        Key: cli.reportObjectKey,
      }),
    );
    const report = geocodeFactoriesReportSchema.parse(
      JSON.parse(await reportResponse.Body!.transformToString()),
    );
    return { cli, report, result };
  }

  it("imports 90/100 clusters and factories and reruns without duplicates", async () => {
    const firstClusters = await enqueueWithCli("clusters", clusterRows());
    expect(firstClusters.result.totals).toEqual({
      received: 100,
      inserted: 90,
      updated: 0,
      failed: 10,
    });
    expect(firstClusters.report.failures).toHaveLength(10);

    const clusterState = await pool.query<{
      count: string;
      distinct_ids: string;
      relation_count: string;
      srid: number;
    }>(
      `select
         count(*)::text as count,
         count(distinct c.id)::text as distinct_ids,
         (select count(*)::text from cluster_categories) as relation_count,
         min(ST_SRID(c.centroid)) as srid
       from clusters c`,
    );
    expect(clusterState.rows[0]).toMatchObject({
      count: "90",
      distinct_ids: "90",
      relation_count: "90",
      srid: 4326,
    });
    const originalClusterId = await pool.query<{ id: string }>(
      "select id from clusters where slug = 'cluster-000'",
    );
    await pool.query(
      `update clusters
       set status = 'published', published_at = now()
       where slug = 'cluster-000'`,
    );

    const rerunClusters = await enqueueWithCli("clusters", clusterRows());
    expect(rerunClusters.result.totals).toEqual({
      received: 100,
      inserted: 0,
      updated: 90,
      failed: 10,
    });
    const preservedCluster = await pool.query<{
      id: string;
      status: string;
      count: string;
    }>(
      `select id, status,
         (select count(*)::text from clusters) as count
       from clusters where slug = 'cluster-000'`,
    );
    expect(preservedCluster.rows[0]).toMatchObject({
      id: originalClusterId.rows[0]?.id,
      status: "published",
      count: "90",
    });

    const firstFactories = await enqueueWithCli("factories", factoryRows());
    expect(firstFactories.result.totals).toEqual({
      received: 100,
      inserted: 90,
      updated: 0,
      failed: 10,
    });
    const factoryState = await pool.query<{
      count: string;
      relation_count: string;
      srid: number;
      has_gcj: boolean;
      converted: boolean;
    }>(
      `select
         count(*)::text as count,
         (select count(*)::text from factory_categories) as relation_count,
         min(ST_SRID(location)) as srid,
         bool_and(location_gcj02 is not null) as has_gcj,
         bool_and(abs(ST_X(location) - (location_gcj02->>'lng')::double precision) > 0.0001) as converted
       from factories`,
    );
    expect(factoryState.rows[0]).toMatchObject({
      count: "90",
      relation_count: "90",
      srid: 4326,
      has_gcj: true,
      converted: true,
    });
    const originalFactoryId = await pool.query<{ id: string }>(
      "select id from factories where slug = 'factory-000'",
    );
    await pool.query(
      `update factories
       set status = 'published', published_at = now(), verified = true,
           verified_at = now(), last_verified_at = now(),
           verified_by = 'admin_test'
       where slug = 'factory-000'`,
    );

    const rerunFactories = await enqueueWithCli("factories", factoryRows());
    expect(rerunFactories.result.totals).toEqual({
      received: 100,
      inserted: 0,
      updated: 90,
      failed: 10,
    });
    const preservedFactory = await pool.query<{
      id: string;
      status: string;
      verified: boolean;
      count: string;
    }>(
      `select id, status, verified,
         (select count(*)::text from factories) as count
       from factories where slug = 'factory-000'`,
    );
    expect(preservedFactory.rows[0]).toMatchObject({
      id: originalFactoryId.rows[0]?.id,
      status: "published",
      verified: true,
      count: "90",
    });
  }, 180_000);

  it("geocodes coordinate-less factories, reports dirty rows, and resets verification on rerun", async () => {
    const baseRow = {
      name: { en: "Geocoded Factory", zh: "地理编码工厂" },
      clusterSlug: null,
      regionId,
      categorySlugs: ["lighting"],
      mainProducts: [{ en: "LED components", zh: "LED 零部件" }],
      certifications: [],
      moq: null,
      establishedYear: null,
      employeeRange: null,
      contact: null,
      images: [],
      sourceName: "geocoding-e2e",
      sourceUrl: null,
    };
    const rows = [
      {
        ...baseRow,
        slug: "geocode-e2e-primary",
        address: {
          en: "6 Futong East Street, Beijing, China",
          zh: "北京市朝阳区阜通东大街6号",
        },
      },
      {
        ...baseRow,
        slug: "geocode-e2e-secondary",
        name: { en: "Second Geocoded Factory", zh: "第二地理编码工厂" },
        address: {
          en: "8 Futong East Street, Beijing, China",
          zh: "北京市朝阳区阜通东大街8号",
        },
      },
      {
        ...baseRow,
        slug: "geocode-e2e-no-result",
        name: { en: "Unmatched Factory", zh: "无法匹配工厂" },
        address: {
          en: "Unmatched address",
          zh: "无法匹配的地址",
        },
      },
    ];

    const first = await enqueueGeocodeWithCli(rows);
    expect(first.result.totals).toEqual({
      received: 3,
      inserted: 2,
      updated: 0,
      failed: 1,
    });
    expect(first.cli.sourceObjectKey).toContain("/imports/geocode-factories/");
    expect(first.report.successes[0]).toMatchObject({
      slug: "geocode-e2e-primary",
      action: "inserted",
      candidateCount: 2,
      formattedAddress: "北京市朝阳区阜通东大街6号",
      matchLevel: "门牌号",
      locationGcj02: { lng: 116.480881, lat: 39.98941 },
    });
    expect(first.report.failures).toEqual([
      expect.objectContaining({
        slug: "geocode-e2e-no-result",
        issues: [
          expect.objectContaining({
            path: ["address", "zh"],
            code: "geocoding_failed",
          }),
        ],
      }),
    ]);

    const initial = await pool.query<{
      id: string;
      status: string;
      verified: boolean;
      srid: number;
      gcj_lng: number;
      wgs_lng: number;
      search_text_en: string;
    }>(
      `select id, status, verified, ST_SRID(location) as srid,
         (location_gcj02->>'lng')::double precision as gcj_lng,
         ST_X(location) as wgs_lng, search_text_en
       from factories
       where slug = 'geocode-e2e-primary'`,
    );
    expect(initial.rows[0]).toMatchObject({
      status: "draft",
      verified: false,
      srid: 4326,
      gcj_lng: 116.480881,
    });
    expect(initial.rows[0]?.search_text_en).toContain("Lighting");
    expect(
      Math.abs(
        (initial.rows[0]?.gcj_lng ?? 0) - (initial.rows[0]?.wgs_lng ?? 0),
      ),
    ).toBeGreaterThan(0.001);

    await pool.query(
      `update factories
       set status = 'published', published_at = now(), verified = true,
           verified_at = now(), last_verified_at = now(),
           verified_by = 'admin_geocode_e2e'
       where slug = 'geocode-e2e-primary'`,
    );
    const rerunRows = rows.map((row) =>
      row.slug === "geocode-e2e-primary"
        ? {
            ...row,
            address: {
              en: "Updated address, Beijing, China",
              zh: "北京市朝阳区更新地址10号",
            },
          }
        : row,
    );
    const second = await enqueueGeocodeWithCli(rerunRows);
    expect(second.result.totals).toEqual({
      received: 3,
      inserted: 0,
      updated: 2,
      failed: 1,
    });

    const rerunState = await pool.query<{
      count: string;
      id: string;
      status: string;
      published_at: Date | null;
      verified: boolean;
      verified_at: Date | null;
      last_verified_at: Date | null;
      verified_by: string | null;
      gcj_lng: number;
    }>(
      `select id, status, published_at, verified, verified_at,
         last_verified_at, verified_by,
         (location_gcj02->>'lng')::double precision as gcj_lng,
         (select count(*)::text from factories
          where slug like 'geocode-e2e-%') as count
       from factories
       where slug = 'geocode-e2e-primary'`,
    );
    expect(rerunState.rows[0]).toMatchObject({
      count: "2",
      id: initial.rows[0]?.id,
      status: "published",
      published_at: expect.any(Date),
      verified: false,
      verified_at: null,
      last_verified_at: null,
      verified_by: null,
      gcj_lng: 116.490881,
    });
  }, 180_000);

  it("seeds canonical data twice through R2 and the Worker without duplicates", async () => {
    const seedDirectory = resolve(workspaceRoot, "data/staging/real-seed");
    const seedData = await loadRealSeedData(seedDirectory);
    const first = await runRealSeed({
      environment: process.env,
      argumentsList: [],
      seedDirectory,
    });
    expect(first.searchTextRegeneration).toMatchObject({
      categoriesRegenerated: 1,
      categoryIds: [categoryId],
      clustersRegenerated: 90,
      factoriesRegenerated: 92,
    });
    expect(first.searchTextRegeneration?.jobId).toEqual(expect.any(String));
    expect(first.clusters.totals).toEqual({
      received: 10,
      inserted: 10,
      updated: 0,
      failed: 0,
    });
    expect(first.factories.totals).toEqual({
      received: 50,
      inserted: 50,
      updated: 0,
      failed: 0,
    });
    const regeneratedSearchText = await pool.query<{
      cluster_search: string;
      factory_search: string;
    }>(
      `select
         (select search_text_en from clusters where slug = 'cluster-000')
           as cluster_search,
         (select search_text_en from factories where slug = 'factory-000')
           as factory_search`,
    );
    expect(regeneratedSearchText.rows[0]?.cluster_search).toContain(
      "Lighting lights lamps luminaires",
    );
    expect(regeneratedSearchText.rows[0]?.factory_search).toContain(
      "Lighting lights lamps luminaires",
    );

    const firstIds = await pool.query<{ id: string; slug: string }>(
      `select id, slug from clusters where slug = any($1::text[])
       union all
       select id, slug from factories where slug = any($2::text[])
       order by slug`,
      [
        seedData.clusters.map(({ slug }) => slug),
        seedData.factories.map(({ slug }) => slug),
      ],
    );
    expect(firstIds.rows).toHaveLength(60);

    const second = await runRealSeed({
      environment: process.env,
      argumentsList: [],
      seedDirectory,
    });
    expect(second.searchTextRegeneration).toBeNull();
    expect(second.clusters.totals).toEqual({
      received: 10,
      inserted: 0,
      updated: 10,
      failed: 0,
    });
    expect(second.factories.totals).toEqual({
      received: 50,
      inserted: 0,
      updated: 50,
      failed: 0,
    });

    const state = await pool.query<{
      cluster_count: string;
      factory_count: string;
      unsafe_clusters: string;
      unsafe_factories: string;
    }>(
      `select
         (select count(*)::text from clusters
          where slug = any($1::text[])) as cluster_count,
         (select count(*)::text from factories
          where slug = any($2::text[])) as factory_count,
         (select count(*)::text from clusters
          where slug = any($1::text[])
            and (status <> 'draft' or published_at is not null)) as unsafe_clusters,
         (select count(*)::text from factories
          where slug = any($2::text[])
            and (status <> 'draft' or verified or published_at is not null
              or verified_at is not null or last_verified_at is not null
              or verified_by is not null)) as unsafe_factories`,
      [
        seedData.clusters.map(({ slug }) => slug),
        seedData.factories.map(({ slug }) => slug),
      ],
    );
    expect(state.rows[0]).toEqual({
      cluster_count: "10",
      factory_count: "50",
      unsafe_clusters: "0",
      unsafe_factories: "0",
    });

    const secondIds = await pool.query<{ id: string; slug: string }>(
      `select id, slug from clusters where slug = any($1::text[])
       union all
       select id, slug from factories where slug = any($2::text[])
       order by slug`,
      [
        seedData.clusters.map(({ slug }) => slug),
        seedData.factories.map(({ slug }) => slug),
      ],
    );
    expect(secondIds.rows).toEqual(firstIds.rows);
  }, 180_000);
});

import "reflect-metadata";

import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { arch, cpus, freemem, platform, release, totalmem } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSearchText,
  getMapClusterPointsResponseSchema,
  getMapFactoriesResponseSchema,
  searchResponseSchema,
  type FactoryImportRow,
} from "@chinasupply/schemas";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Pool, type PoolClient } from "pg";
import {
  GenericContainer,
  TestContainers,
  type StartedTestContainer,
  Wait,
} from "testcontainers";

import { AppModule } from "../src/app.module.js";
import { registerEdgeProxy } from "../src/common/http/edge-proxy.js";
import { configureHttpApplication } from "../src/http-application.js";
import { ClientIpThrottlerGuard } from "../src/rate-limit/client-ip-throttler.guard.js";
import {
  generateSyntheticFactoryRows,
  LOAD_DATA_GENERATOR_VERSION,
} from "../src/seeds/generate-load-data.js";
import {
  loadRealSeedData,
  type RealSeedData,
} from "../src/seeds/real-seed-data.js";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const loadScriptsDirectory = resolve(workspaceRoot, "apps/api/load");
const resultsDirectory = resolve(workspaceRoot, ".generated/load-results");
const seedDirectory = resolve(workspaceRoot, "data/staging/real-seed");
const manifestPath = resolve(workspaceRoot, "data/load/manifest.json");
const factoryCount = 5_000;
const mapBoundingBox = "70,0,140,60";
const postgresPort = 5432;
const redisPort = 6379;
const k6Image = "grafana/k6:2.0.0";
const publishedAt = "2026-07-24T00:00:00.000Z";
const mapGzipLimitBytes = 500_000;

interface LoadManifest {
  files: {
    bytes: number;
    count: number;
    path: string;
    sha256: string;
  }[];
}

interface K6Summary {
  metrics: Record<
    string,
    {
      values?: Record<string, number>;
      med?: number;
      "p(95)"?: number;
    }
  >;
}

interface LoadFactoryRecord {
  address: FactoryImportRow["address"];
  categoryIds: string[];
  clusterId: string;
  id: string;
  lat: number;
  lng: number;
  mainProducts: FactoryImportRow["mainProducts"];
  name: FactoryImportRow["name"];
  regionId: string;
  searchTextEn: string;
  searchTextZh: string;
  slug: string;
  sourceName: string | null;
  sourceUrl: string | null;
}

function commandOutput(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "unavailable";
}

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

function loadId(prefix: "cluster" | "factory", index: number): string {
  const shortPrefix = prefix === "cluster" ? "lclu" : "lfac";
  return `${shortPrefix}${String(index + 1).padStart(17, "0")}`;
}

function chunk<Row>(rows: readonly Row[], size: number): Row[][] {
  const chunks: Row[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function seedRegionsAndCategories(
  client: PoolClient,
  seed: RealSeedData,
): Promise<Map<string, string>> {
  for (const region of seed.regions) {
    await client.query(
      `insert into regions (id, level, name, centroid, boundary)
       values (
         $1,
         $2,
         $3::jsonb,
         ST_SetSRID(ST_MakePoint($4, $5), 4326),
         case
           when $6::text is null then null
           else ST_Multi(
             ST_SetSRID(ST_GeomFromGeoJSON($6::text), 4326)
           )
         end
       )`,
      [
        region.id,
        region.level,
        JSON.stringify(region.name),
        region.centroid[0],
        region.centroid[1],
        region.boundary === null ? null : JSON.stringify(region.boundary),
      ],
    );
  }

  const categoryIdsBySlug = new Map(
    seed.categories.map((category) => [category.slug, category.id]),
  );
  const orderedCategories = [
    ...seed.categories.filter(({ parentSlug }) => parentSlug === null),
    ...seed.categories.filter(({ parentSlug }) => parentSlug !== null),
  ];

  for (const category of orderedCategories) {
    const searchText = buildSearchText({
      aliases: category.aliases,
      kind: "category",
      name: category.name,
    });
    const parentId =
      category.parentSlug === null
        ? null
        : (categoryIdsBySlug.get(category.parentSlug) ?? null);
    if (category.parentSlug !== null && parentId === null) {
      throw new Error(`Missing parent category ${category.parentSlug}`);
    }
    await client.query(
      `insert into categories
         (id, parent_id, name, slug, icon, color, aliases, sort_order,
          search_text_en, search_text_zh)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
      [
        category.id,
        parentId,
        JSON.stringify(category.name),
        category.slug,
        category.icon,
        category.color,
        JSON.stringify(category.aliases),
        category.sortOrder,
        searchText.searchTextEn,
        searchText.searchTextZh,
      ],
    );
  }

  return categoryIdsBySlug;
}

async function seedClusters(
  client: PoolClient,
  seed: RealSeedData,
  categoryIdsBySlug: ReadonlyMap<string, string>,
): Promise<Map<string, string>> {
  const categoriesBySlug = new Map(
    seed.categories.map((category) => [category.slug, category]),
  );
  const clusterIdsBySlug = new Map<string, string>();

  for (const [index, cluster] of seed.clusters.entries()) {
    const id = loadId("cluster", index);
    const primaryCategoryId = categoryIdsBySlug.get(
      cluster.primaryCategorySlug,
    );
    if (primaryCategoryId === undefined) {
      throw new Error(
        `Missing primary category ${cluster.primaryCategorySlug}`,
      );
    }
    const clusterCategories = cluster.categorySlugs.map((slug) => {
      const category = categoriesBySlug.get(slug);
      if (category === undefined) {
        throw new Error(`Missing cluster category ${slug}`);
      }
      return category;
    });
    const searchText = buildSearchText({
      categories: clusterCategories,
      kind: "cluster",
      mainProducts: cluster.mainProducts,
      name: cluster.name,
      summary: cluster.summary,
    });

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
         ST_SetSRID(ST_MakePoint($6, $7), 4326),
         case
           when $8::text is null then null
           else ST_Multi(
             ST_SetSRID(ST_GeomFromGeoJSON($8::text), 4326)
           )
         end,
         $9::jsonb,
         $10::jsonb,
         $11::jsonb,
         $12,
         $13::jsonb,
         'published',
         $14::timestamptz,
         $15,
         $16
       )`,
      [
        id,
        cluster.slug,
        JSON.stringify(cluster.name),
        cluster.regionId,
        primaryCategoryId,
        cluster.centroid[0],
        cluster.centroid[1],
        cluster.boundary === null ? null : JSON.stringify(cluster.boundary),
        JSON.stringify(cluster.summary),
        cluster.description === null
          ? null
          : JSON.stringify(cluster.description),
        JSON.stringify(cluster.mainProducts),
        cluster.coverImage,
        cluster.stats === null ? null : JSON.stringify(cluster.stats),
        publishedAt,
        searchText.searchTextEn,
        searchText.searchTextZh,
      ],
    );

    for (const categorySlug of cluster.categorySlugs) {
      const categoryId = categoryIdsBySlug.get(categorySlug);
      if (categoryId === undefined) {
        throw new Error(`Missing cluster category ${categorySlug}`);
      }
      await client.query(
        `insert into cluster_categories (cluster_id, category_id)
         values ($1, $2)`,
        [id, categoryId],
      );
    }
    clusterIdsBySlug.set(cluster.slug, id);
  }

  return clusterIdsBySlug;
}

function toLoadFactoryRecords(
  rows: readonly FactoryImportRow[],
  seed: RealSeedData,
  categoryIdsBySlug: ReadonlyMap<string, string>,
  clusterIdsBySlug: ReadonlyMap<string, string>,
): LoadFactoryRecord[] {
  const categoriesBySlug = new Map(
    seed.categories.map((category) => [category.slug, category]),
  );

  return rows.map((row, index) => {
    if (row.clusterSlug === null) {
      throw new Error(`Load factory ${row.slug} must reference a cluster`);
    }
    const clusterId = clusterIdsBySlug.get(row.clusterSlug);
    if (clusterId === undefined) {
      throw new Error(`Missing factory cluster ${row.clusterSlug}`);
    }
    const factoryCategories = row.categorySlugs.map((slug) => {
      const category = categoriesBySlug.get(slug);
      if (category === undefined) {
        throw new Error(`Missing factory category ${slug}`);
      }
      return category;
    });
    const categoryIds = row.categorySlugs.map((slug) => {
      const categoryId = categoryIdsBySlug.get(slug);
      if (categoryId === undefined) {
        throw new Error(`Missing factory category ${slug}`);
      }
      return categoryId;
    });
    const searchText = buildSearchText({
      categories: factoryCategories,
      kind: "factory",
      mainProducts: row.mainProducts,
      name: row.name,
    });

    return {
      address: row.address,
      categoryIds,
      clusterId,
      id: loadId("factory", index),
      lat: row.location[1],
      lng: row.location[0],
      mainProducts: row.mainProducts,
      name: row.name,
      regionId: row.regionId,
      searchTextEn: searchText.searchTextEn,
      searchTextZh: searchText.searchTextZh,
      slug: row.slug,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
    };
  });
}

async function seedFactories(
  client: PoolClient,
  rows: readonly LoadFactoryRecord[],
): Promise<void> {
  for (const rowsChunk of chunk(rows, 500)) {
    const serializedRows = JSON.stringify(rowsChunk);
    await client.query(
      `with source as (
         select *
         from jsonb_to_recordset($1::jsonb) as item(
           id text,
           slug text,
           name jsonb,
           "clusterId" text,
           "regionId" text,
           address jsonb,
           lng double precision,
           lat double precision,
           "mainProducts" jsonb,
           "sourceName" text,
           "sourceUrl" text,
           "searchTextEn" text,
           "searchTextZh" text,
           "categoryIds" jsonb
         )
       )
       insert into factories
         (id, slug, name, cluster_id, region_id, address, location,
          main_products, source_name, source_url, status, published_at,
          search_text_en, search_text_zh)
       select
         id,
         slug,
         name,
         "clusterId",
         "regionId",
         address,
         ST_SetSRID(ST_MakePoint(lng, lat), 4326),
         "mainProducts",
         "sourceName",
         "sourceUrl",
         'published',
         $2::timestamptz,
         "searchTextEn",
         "searchTextZh"
       from source`,
      [serializedRows, publishedAt],
    );
    await client.query(
      `with source as (
         select *
         from jsonb_to_recordset($1::jsonb) as item(
           id text,
           "categoryIds" jsonb
         )
       )
       insert into factory_categories (factory_id, category_id)
       select source.id, category.value
       from source
       cross join lateral jsonb_array_elements_text(
         source."categoryIds"
       ) as category(value)`,
      [serializedRows],
    );
  }
}

async function seedLoadDatabase(
  pool: Pool,
  seed: RealSeedData,
  syntheticFactories: readonly FactoryImportRow[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const categoryIdsBySlug = await seedRegionsAndCategories(client, seed);
    const clusterIdsBySlug = await seedClusters(
      client,
      seed,
      categoryIdsBySlug,
    );
    const records = toLoadFactoryRecords(
      syntheticFactories,
      seed,
      categoryIdsBySlug,
      clusterIdsBySlug,
    );
    await seedFactories(client, records);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  const counts = await pool.query<{
    clusters: string;
    factories: string;
  }>(
    `select
       (select count(*)::text from clusters) as clusters,
       (select count(*)::text from factories) as factories`,
  );
  if (
    counts.rows[0]?.clusters !== String(seed.clusters.length) ||
    counts.rows[0]?.factories !== String(factoryCount)
  ) {
    throw new Error(
      `Unexpected load fixture counts: ${JSON.stringify(counts.rows[0])}`,
    );
  }
}

async function createLoadApplication(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ClientIpThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const adapter = new FastifyAdapter();
  registerEdgeProxy(adapter.getInstance(), { appEnvironment: "local" });
  const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
  configureHttpApplication(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  await app.listen(0, "0.0.0.0");
  return app;
}

async function assertPreflight(
  baseUrl: string,
): Promise<{ gzipBytes: number; rawBytes: number }> {
  const [mapPointsResponse, mapFactoriesResponse, searchResponse] =
    await Promise.all([
      fetch(`${baseUrl}/map/clusters/points`),
      fetch(`${baseUrl}/map/factories?bbox=${mapBoundingBox}`),
      fetch(`${baseUrl}/search?q=led`),
    ]);

  const mapPointsText = await mapPointsResponse.text();
  const mapPoints = getMapClusterPointsResponseSchema.parse(
    JSON.parse(mapPointsText) as unknown,
  );
  const mapFactories = getMapFactoriesResponseSchema.parse(
    (await mapFactoriesResponse.json()) as unknown,
  );
  const search = searchResponseSchema.parse(
    (await searchResponse.json()) as unknown,
  );

  if (!mapPointsResponse.ok || !mapFactoriesResponse.ok || !searchResponse.ok) {
    throw new Error("Load-test preflight returned a non-success response");
  }
  if (mapPoints.data.features.length !== 10) {
    throw new Error(
      `MAP-1 preflight returned ${mapPoints.data.features.length} clusters`,
    );
  }
  if (
    mapFactories.data.features.length !== factoryCount ||
    mapFactories.meta.truncated
  ) {
    throw new Error(
      `MAP-3 preflight expected ${factoryCount} non-truncated factories`,
    );
  }
  if (
    search.data.categories.length +
      search.data.clusters.length +
      search.data.factories.length ===
    0
  ) {
    throw new Error("Search preflight returned no results for led");
  }

  const gzipBytes = gzipSync(Buffer.from(mapPointsText)).byteLength;
  const rawBytes = Buffer.byteLength(mapPointsText);
  await writeFile(
    resolve(resultsDirectory, "map1-size.json"),
    `${JSON.stringify(
      {
        gzipBytes,
        limitBytes: mapGzipLimitBytes,
        passed: gzipBytes < mapGzipLimitBytes,
        rawBytes,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  if (gzipBytes >= mapGzipLimitBytes) {
    throw new Error(
      `MAP-1 gzip size ${gzipBytes} exceeds ${mapGzipLimitBytes} bytes`,
    );
  }
  return { gzipBytes, rawBytes };
}

async function runK6Scenario(
  container: StartedTestContainer,
  input: { apiBaseUrl: string; name: string; script: string },
): Promise<K6Summary> {
  const result = await container.exec(
    [
      "k6",
      "run",
      `--summary-export=/results/${input.name}-summary.json`,
      `/scripts/${input.script}`,
    ],
    {
      env: {
        API_BASE_URL: input.apiBaseUrl,
      },
    },
  );
  await writeFile(
    resolve(resultsDirectory, `${input.name}.log`),
    `${result.output}\n`,
    "utf8",
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `k6 ${input.name} failed with exit code ${result.exitCode}\n${result.output}`,
    );
  }
  return JSON.parse(
    await readFile(
      resolve(resultsDirectory, `${input.name}-summary.json`),
      "utf8",
    ),
  ) as K6Summary;
}

function trendValues(
  summary: K6Summary,
  metric: string,
): { p50Ms: number; p95Ms: number } {
  const rawMetric = summary.metrics[metric];
  const values = rawMetric?.values ?? rawMetric;
  const p50Ms = values?.med;
  const p95Ms = values?.["p(95)"];
  if (p50Ms === undefined || p95Ms === undefined) {
    throw new Error(`k6 summary is missing ${metric} trend values`);
  }
  return { p50Ms, p95Ms };
}

async function main(): Promise<void> {
  await rm(resultsDirectory, { force: true, recursive: true });
  await mkdir(resultsDirectory, { recursive: true });

  let app: NestFastifyApplication | undefined;
  let k6: StartedTestContainer | undefined;
  let pool: Pool | undefined;
  let postgres: StartedTestContainer | undefined;
  let redis: StartedTestContainer | undefined;

  try {
    [postgres, redis] = await Promise.all([
      new GenericContainer("postgis/postgis:17-3.5")
        .withEnvironment({
          POSTGRES_DB: "chinasupply_load",
          POSTGRES_PASSWORD: "chinasupply_load_only",
          POSTGRES_USER: "chinasupply",
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

    const databaseUrl = `postgresql://chinasupply:chinasupply_load_only@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/chinasupply_load`;
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(redisPort)}`;
    Object.assign(process.env, {
      APP_ENV: "local",
      DATABASE_URL: databaseUrl,
      PORT: "3001",
      R2_CDN_BASE_URL: "http://127.0.0.1:9000",
      REDIS_URL: redisUrl,
      WEB_ORIGIN: "http://127.0.0.1:3000",
    });

    runMigration(databaseUrl);
    pool = new Pool({
      application_name: "chinasupply-load-test",
      connectionString: databaseUrl,
      max: 2,
    });
    const seed = await loadRealSeedData(seedDirectory);
    const syntheticFactories = generateSyntheticFactoryRows(5_000, seed);
    await seedLoadDatabase(pool, seed, syntheticFactories);

    app = await createLoadApplication();
    const appUrl = new URL(await app.getUrl());
    const appPort = Number(appUrl.port);
    const localBaseUrl = `http://127.0.0.1:${appPort}/api/v1`;
    const size = await assertPreflight(localBaseUrl);

    await TestContainers.exposeHostPorts(appPort);
    const k6BaseUrl = `http://host.testcontainers.internal:${appPort}/api/v1`;
    k6 = await new GenericContainer(k6Image)
      .withEntrypoint(["/bin/sh"])
      .withCommand(["-c", "sleep 3600"])
      .withBindMounts([
        {
          mode: "ro",
          source: loadScriptsDirectory,
          target: "/scripts",
        },
        {
          mode: "rw",
          source: resultsDirectory,
          target: "/results",
        },
      ])
      .withStartupTimeout(120_000)
      .start();
    const k6Version = await k6.exec(["k6", "version"]);

    const mapSummary = await runK6Scenario(k6, {
      apiBaseUrl: k6BaseUrl,
      name: "map-factories",
      script: "map-factories.js",
    });
    const searchSummary = await runK6Scenario(k6, {
      apiBaseUrl: k6BaseUrl,
      name: "search",
      script: "search.js",
    });
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as LoadManifest;
    const fixture = manifest.files.find(({ count }) => count === factoryCount);
    if (fixture === undefined) {
      throw new Error(`Load manifest has no ${factoryCount}-row fixture`);
    }

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      commitSha: commandOutput("git", ["rev-parse", "HEAD"]),
      dataset: {
        clusters: seed.clusters.length,
        factories: factoryCount,
        generatorVersion: LOAD_DATA_GENERATOR_VERSION,
        manifestBytes: fixture.bytes,
        manifestSha256: fixture.sha256,
      },
      environment: {
        architecture: arch(),
        cpuCount: cpus().length,
        cpuModel: cpus()[0]?.model ?? "unknown",
        dockerVersion: commandOutput("docker", [
          "version",
          "--format",
          "{{.Server.Version}}",
        ]),
        freeMemoryBytes: freemem(),
        k6Image,
        k6Version: k6Version.stdout.trim(),
        nodeVersion: process.version,
        os: `${platform()} ${release()}`,
        totalMemoryBytes: totalmem(),
      },
      profile: {
        rampDown: "5s",
        rampUp: "5s",
        steady: "30s",
        virtualUsers: 10,
      },
      map1: size,
      map3: trendValues(mapSummary, "map_duration"),
      search: trendValues(searchSummary, "search_duration"),
      thresholds: {
        map1GzipBytes: `<${mapGzipLimitBytes}`,
        map3P95Ms: "<500",
        searchP95Ms: "<300",
      },
    };
    await writeFile(
      resolve(resultsDirectory, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await Promise.allSettled([
      k6?.stop(),
      app?.close(),
      pool?.end(),
      redis?.stop(),
      postgres?.stop(),
    ]);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

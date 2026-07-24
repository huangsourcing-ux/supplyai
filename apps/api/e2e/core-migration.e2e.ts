import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool, type PoolClient } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const postgresPort = 5432;
const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const credentials = {
  database: "chinasupply_migration_e2e",
  password: "chinasupply_migration_e2e_only",
  user: "chinasupply",
};
const coreTables = [
  "categories",
  "cluster_categories",
  "clusters",
  "factories",
  "factory_categories",
  "favorites",
  "regions",
  "users",
  "webhook_events",
];
const requiredIndexes = [
  "categories_search_text_en_fts_gin",
  "categories_search_text_en_trgm_gin",
  "categories_search_text_zh_trgm_gin",
  "clusters_centroid_gist",
  "clusters_search_text_en_fts_gin",
  "clusters_search_text_en_trgm_gin",
  "clusters_search_text_zh_trgm_gin",
  "clusters_status_published_at_id_idx",
  "factories_location_gist",
  "factories_search_text_en_fts_gin",
  "factories_search_text_en_trgm_gin",
  "factories_search_text_zh_trgm_gin",
  "factories_status_cluster_id_idx",
  "factories_status_published_at_id_idx",
  "regions_boundary_gist",
];

function runWorkspaceCommand(args: string[], environment: NodeJS.ProcessEnv) {
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(executable, args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: environment,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: pnpm ${args.join(" ")}`,
        result.stdout,
        result.stderr,
      ].join("\n"),
    );
  }
}

async function insertValidFoundation(
  client: PoolClient,
  suffix: string,
): Promise<{ categoryId: string; clusterId: string; regionId: string }> {
  const categoryId = `category${suffix}`.padEnd(21, "c").slice(0, 21);
  const clusterId = `cluster${suffix}`.padEnd(21, "l").slice(0, 21);
  const regionId = `region${suffix}`.padEnd(21, "r").slice(0, 21);

  await client.query(
    `insert into regions
      (id, level, name, centroid)
     values ($1, 'city', $2::jsonb, ST_SetSRID(ST_MakePoint(120.1, 30.2), 4326))`,
    [regionId, JSON.stringify({ en: "Test City", zh: "测试市" })],
  );
  await client.query(
    `insert into categories
      (id, name, slug, color, search_text_en, search_text_zh)
     values ($1, $2::jsonb, $3, '#112233', 'lighting', '照明')`,
    [
      categoryId,
      JSON.stringify({ en: "Lighting", zh: "照明" }),
      `lighting-${suffix}`,
    ],
  );
  await client.query("begin");
  await client.query(
    `insert into clusters
      (id, slug, name, region_id, primary_category_id, centroid, summary,
       main_products, search_text_en, search_text_zh)
     values
      ($1, $2, $3::jsonb, $4, $5,
       ST_SetSRID(ST_MakePoint(120.2, 30.3), 4326), $6::jsonb, '[]'::jsonb,
       'lighting cluster', '照明产业带')`,
    [
      clusterId,
      `lighting-cluster-${suffix}`,
      JSON.stringify({ en: "Lighting Cluster", zh: "照明产业带" }),
      regionId,
      categoryId,
      JSON.stringify({ en: "Lighting makers", zh: "照明制造商" }),
    ],
  );
  await client.query(
    `insert into cluster_categories (cluster_id, category_id)
     values ($1, $2)`,
    [clusterId, categoryId],
  );
  await client.query("commit");

  return { categoryId, clusterId, regionId };
}

describe.sequential("core migration e2e", () => {
  let container: StartedTestContainer;
  let databaseUrl: string;
  let pool: Pool;
  let payloadTablesBeforeCore: string[];

  beforeAll(async () => {
    container = await new GenericContainer("postgis/postgis:17-3.5")
      .withEnvironment({
        POSTGRES_DB: credentials.database,
        POSTGRES_PASSWORD: credentials.password,
        POSTGRES_USER: credentials.user,
      })
      .withExposedPorts(postgresPort)
      .withPlatform("linux/amd64")
      .withStartupTimeout(120_000)
      .withWaitStrategy(
        Wait.forLogMessage(/database system is ready to accept connections/, 2),
      )
      .start();

    databaseUrl = `postgresql://${credentials.user}:${credentials.password}@${container.getHost()}:${container.getMappedPort(postgresPort)}/${credentials.database}`;
    pool = new Pool({ connectionString: databaseUrl });
    const commandEnvironment = {
      ...process.env,
      APP_ENV: "local",
      DATABASE_URL: databaseUrl,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      PAYLOAD_SECRET: "migration_e2e_payload_secret_32_chars",
    };

    runWorkspaceCommand(
      ["--filter", "@chinasupply/web", "cms:migrate"],
      commandEnvironment,
    );

    const payloadResult = await pool.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and (table_name = 'cms_users' or table_name like 'payload_%')
       order by table_name`,
    );
    payloadTablesBeforeCore = payloadResult.rows.map((row) => row.table_name);
    expect(payloadTablesBeforeCore).toContain("cms_users");
    expect(payloadTablesBeforeCore).toContain("payload_migrations");

    runWorkspaceCommand(
      ["--filter", "@chinasupply/api", "db:migrate"],
      commandEnvironment,
    );
    runWorkspaceCommand(
      ["--filter", "@chinasupply/api", "db:migrate"],
      commandEnvironment,
    );
  }, 180_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it("installs extensions and only the expected core tables", async () => {
    const extensionResult = await pool.query<{ extname: string }>(
      `select extname
       from pg_extension
       where extname in ('postgis', 'pg_trgm')
       order by extname`,
    );
    expect(extensionResult.rows.map((row) => row.extname)).toEqual([
      "pg_trgm",
      "postgis",
    ]);

    const tableResult = await pool.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])
       order by table_name`,
      [coreTables],
    );
    expect(tableResult.rows.map((row) => row.table_name)).toEqual(coreTables);
  });

  it("preserves the existing Payload schema verbatim", async () => {
    const payloadResult = await pool.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and (table_name = 'cms_users' or table_name like 'payload_%')
       order by table_name`,
    );
    expect(payloadResult.rows.map((row) => row.table_name)).toEqual(
      payloadTablesBeforeCore,
    );
  });

  it("creates exact SRID/type geometry columns and every required index", async () => {
    const geometryResult = await pool.query<{
      f_geometry_column: string;
      f_table_name: string;
      srid: number;
      type: string;
    }>(
      `select f_table_name, f_geometry_column, type, srid
       from geometry_columns
       where f_table_name in ('regions', 'clusters', 'factories')
       order by f_table_name, f_geometry_column`,
    );
    expect(geometryResult.rows).toEqual([
      {
        f_geometry_column: "boundary",
        f_table_name: "clusters",
        srid: 4326,
        type: "MULTIPOLYGON",
      },
      {
        f_geometry_column: "centroid",
        f_table_name: "clusters",
        srid: 4326,
        type: "POINT",
      },
      {
        f_geometry_column: "location",
        f_table_name: "factories",
        srid: 4326,
        type: "POINT",
      },
      {
        f_geometry_column: "boundary",
        f_table_name: "regions",
        srid: 4326,
        type: "MULTIPOLYGON",
      },
      {
        f_geometry_column: "centroid",
        f_table_name: "regions",
        srid: 4326,
        type: "POINT",
      },
    ]);

    const indexResult = await pool.query<{ indexname: string }>(
      `select indexname
       from pg_indexes
       where schemaname = 'public'
         and indexname = any($1::text[])
       order by indexname`,
      [requiredIndexes],
    );
    expect(indexResult.rows.map((row) => row.indexname)).toEqual(
      [...requiredIndexes].sort(),
    );
  });

  it("enforces ID length and WGS-84 SRID", async () => {
    await expect(
      pool.query(
        `insert into categories
          (id, name, slug, color, search_text_en, search_text_zh)
         values ('too-short', '{"en":"Bad","zh":"错误"}', 'bad-id', '#112233', 'bad', '错误')`,
      ),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      pool.query(
        `insert into regions
          (id, level, name, centroid)
         values
          ('wrong-srid-region-id1', 'city', '{"en":"Bad","zh":"错误"}',
           ST_SetSRID(ST_MakePoint(120, 30), 3857))`,
      ),
    ).rejects.toMatchObject({ code: "22023" });
  });

  it("enforces deferred primary-category membership in both directions", async () => {
    const client = await pool.connect();
    try {
      const valid = await insertValidFoundation(client, "valid");

      await expect(
        client.query(
          `delete from cluster_categories
           where cluster_id = $1 and category_id = $2`,
          [valid.clusterId, valid.categoryId],
        ),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "clusters_primary_category_membership",
      });

      const missingClusterId = "missingjoinclusterid1";
      await client.query("begin");
      await client.query(
        `insert into clusters
          (id, slug, name, region_id, primary_category_id, centroid, summary,
           main_products, search_text_en, search_text_zh)
         values
          ($1, 'missing-join', '{"en":"Missing","zh":"缺失"}', $2, $3,
           ST_SetSRID(ST_MakePoint(120.2, 30.3), 4326),
           '{"en":"Missing","zh":"缺失"}', '[]', 'missing', '缺失')`,
        [missingClusterId, valid.regionId, valid.categoryId],
      );
      await expect(client.query("commit")).rejects.toMatchObject({
        code: "23514",
        constraint: "clusters_primary_category_membership",
      });
      await client.query("rollback");
    } finally {
      client.release();
    }
  });

  it("enforces the frozen two-level category hierarchy", async () => {
    const client = await pool.connect();
    try {
      const rootId = "categoryhierarchyroot";
      const childId = "categoryhierarchychil";
      const grandchildId = "categoryhierarchygran";

      await client.query(
        `insert into categories
          (id, name, slug, color, search_text_en, search_text_zh)
         values
          ($1, '{"en":"Root","zh":"一级"}', 'hierarchy-root', '#112233', 'root', '一级')`,
        [rootId],
      );
      await client.query(
        `insert into categories
          (id, parent_id, name, slug, search_text_en, search_text_zh)
         values
          ($1, $2, '{"en":"Child","zh":"二级"}', 'hierarchy-child', 'child', '二级')`,
        [childId, rootId],
      );
      await expect(
        client.query(
          `insert into categories
            (id, parent_id, name, slug, search_text_en, search_text_zh)
           values
            ($1, $2, '{"en":"Grandchild","zh":"三级"}',
             'hierarchy-grandchild', 'grandchild', '三级')`,
          [grandchildId, childId],
        ),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "categories_two_levels",
      });
    } finally {
      client.release();
    }
  });
});

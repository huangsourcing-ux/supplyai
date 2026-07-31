import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Pool, type PoolClient } from "pg";

import {
  productionContentManifestSchema,
  productionCurationSchema,
  productionDatasetSchema,
  productionMediaManifestEntrySchema,
  type ProductionContentManifest,
  type ProductionCuration,
  type ProductionDataset,
  type ProductionMediaManifestEntry,
} from "./production-content.schemas.js";

const DATASET_CONTENT_TYPE = "application/json";
const MIGRATION_ROOT = "migrations/m5-t8a";
const SYNTHETIC_PATTERN = /(^|[-_/])(synthetic|fixture|test)([-_/]|$)/iu;

interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  mediaBucket: string;
  privateBucket?: string;
}

interface ExportConfig {
  curationPath: string;
  databaseUrl: string;
  sourceStorage: StorageConfig;
  destinationStorage: StorageConfig & { privateBucket: string };
  now?: Date;
}

interface ImportConfig {
  databaseUrl: string;
  manifestObjectKey: string;
  storage: StorageConfig & { privateBucket: string };
}

function createStorageClient(config: StorageConfig): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function digest(body: Uint8Array | string): string {
  return createHash("sha256").update(body).digest("hex");
}

function jsonBody(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique`);
  }
}

function assertExactSelection(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (
    normalizedActual.length !== normalizedExpected.length ||
    normalizedActual.some((value, index) => value !== normalizedExpected[index])
  ) {
    throw new Error(
      `${label} selection mismatch: expected ${normalizedExpected.join(", ")}, received ${normalizedActual.join(", ")}`,
    );
  }
}

function assertNoSyntheticIdentifiers(values: readonly string[]): void {
  const rejected = values.find((value) => SYNTHETIC_PATTERN.test(value));
  if (rejected !== undefined) {
    throw new Error(`Synthetic/test identifier is forbidden: ${rejected}`);
  }
}

function productionObjectKey(sourceObjectKey: string): string {
  if (!sourceObjectKey.startsWith("staging/")) {
    throw new Error(
      `Canonical staging media key must start with staging/: ${sourceObjectKey}`,
    );
  }
  const destination = sourceObjectKey.slice("staging/".length);
  if (destination.length === 0 || destination.startsWith("/")) {
    throw new Error(`Invalid production media key: ${sourceObjectKey}`);
  }
  return destination;
}

function collectMediaKeys(dataset: ProductionDataset): string[] {
  const keys = new Set<string>();
  for (const cluster of dataset.clusters) {
    if (cluster.coverImage !== null) {
      keys.add(cluster.coverImage);
    }
  }
  for (const factory of dataset.factories) {
    for (const image of factory.images) {
      keys.add(image.objectKey);
    }
  }
  for (const medium of dataset.media) {
    keys.add(medium.objectKey);
  }
  return [...keys].sort();
}

function rewriteMediaKeys(dataset: ProductionDataset): ProductionDataset {
  return productionDatasetSchema.parse({
    ...dataset,
    clusters: dataset.clusters.map((cluster) => ({
      ...cluster,
      coverImage:
        cluster.coverImage === null
          ? null
          : productionObjectKey(cluster.coverImage),
    })),
    factories: dataset.factories.map((factory) => ({
      ...factory,
      images: factory.images.map((image) => ({
        ...image,
        objectKey: productionObjectKey(image.objectKey),
      })),
    })),
    media: dataset.media.map((medium) => ({
      ...medium,
      objectKey: productionObjectKey(medium.objectKey),
      prefix: productionObjectKey(
        `${String(medium.prefix)}/placeholder`,
      ).replace(/\/placeholder$/u, ""),
    })),
  });
}

async function getObjectBuffer(
  client: S3Client,
  bucket: string,
  objectKey: string,
): Promise<{ body: Buffer; contentType: string }> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
  );
  if (response.Body === undefined || response.ContentType === undefined) {
    throw new Error(`R2 object is missing body or content type: ${objectKey}`);
  }
  return {
    body: Buffer.from(await response.Body.transformToByteArray()),
    contentType: response.ContentType,
  };
}

async function copyMedia(
  source: StorageConfig,
  destination: StorageConfig,
  sourceObjectKeys: readonly string[],
): Promise<ProductionMediaManifestEntry[]> {
  const sourceClient = createStorageClient(source);
  const destinationClient = createStorageClient(destination);
  const entries: ProductionMediaManifestEntry[] = [];

  for (const sourceObjectKey of sourceObjectKeys) {
    const destinationObjectKey = productionObjectKey(sourceObjectKey);
    const object = await getObjectBuffer(
      sourceClient,
      source.mediaBucket,
      sourceObjectKey,
    );
    const sha256 = digest(object.body);
    const entry = productionMediaManifestEntrySchema.parse({
      sourceObjectKey,
      destinationObjectKey,
      bytes: object.body.byteLength,
      contentType: object.contentType,
      sha256,
    });
    await destinationClient.send(
      new PutObjectCommand({
        Bucket: destination.mediaBucket,
        Key: destinationObjectKey,
        Body: object.body,
        ContentType: entry.contentType,
        Metadata: { sha256 },
      }),
    );
    const head = await destinationClient.send(
      new HeadObjectCommand({
        Bucket: destination.mediaBucket,
        Key: destinationObjectKey,
      }),
    );
    if (
      head.ContentLength !== entry.bytes ||
      head.ContentType !== entry.contentType ||
      head.Metadata?.sha256 !== entry.sha256
    ) {
      throw new Error(
        `Production media HEAD verification failed: ${destinationObjectKey}`,
      );
    }
    entries.push(entry);
  }

  return entries;
}

async function queryCanonicalDataset(
  databaseUrl: string,
  curation: ProductionCuration,
  exportedAt: string,
): Promise<ProductionDataset> {
  const pool = new Pool({
    application_name: "chinasupply-m5-t8a-export",
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    max: 2,
  });
  try {
    const clustersResult = await pool.query(
      `select c.id, c.slug, c.name, c.region_id as "regionId",
        c.primary_category_id as "primaryCategoryId",
        ST_AsGeoJSON(c.centroid)::jsonb as centroid,
        case when c.boundary is null then null
          else ST_AsGeoJSON(c.boundary)::jsonb end as boundary,
        c.summary, c.description, c.main_products as "mainProducts",
        c.cover_image as "coverImage", c.stats, c.status::text,
        c.published_at as "publishedAt",
        c.search_text_en as "searchTextEn",
        c.search_text_zh as "searchTextZh",
        coalesce(array_agg(cc.category_id order by cc.category_id)
          filter (where cc.category_id is not null), '{}') as "categoryIds"
      from clusters c
      left join cluster_categories cc on cc.cluster_id = c.id
      where c.slug = any($1::text[])
      group by c.id
      order by c.slug`,
      [curation.clusterSlugs],
    );
    const factoriesResult = await pool.query(
      `select f.id, f.slug, f.name, f.cluster_id as "clusterId",
        f.region_id as "regionId", f.address,
        ST_AsGeoJSON(f.location)::jsonb as location,
        f.location_gcj02 as "locationGcj02",
        f.main_products as "mainProducts", f.certifications, f.moq,
        f.established_year as "establishedYear",
        f.employee_range as "employeeRange", f.contact, f.images,
        f.source_name as "sourceName", f.source_url as "sourceUrl",
        f.verified, f.verified_at as "verifiedAt",
        f.last_verified_at as "lastVerifiedAt",
        f.verified_by as "verifiedBy", f.status::text,
        f.published_at as "publishedAt",
        f.search_text_en as "searchTextEn",
        f.search_text_zh as "searchTextZh",
        coalesce(array_agg(fc.category_id order by fc.category_id)
          filter (where fc.category_id is not null), '{}') as "categoryIds"
      from factories f
      left join factory_categories fc on fc.factory_id = f.id
      where f.slug = any($1::text[])
      group by f.id
      order by f.slug`,
      [curation.factorySlugs],
    );
    assertExactSelection(
      clustersResult.rows.map((row) => String(row.slug)),
      curation.clusterSlugs,
      "Cluster",
    );
    assertExactSelection(
      factoriesResult.rows.map((row) => String(row.slug)),
      curation.factorySlugs,
      "Factory",
    );

    const regionIds = [
      ...new Set(
        [...clustersResult.rows, ...factoriesResult.rows].map((row) =>
          String(row.regionId),
        ),
      ),
    ];
    const categoryIds = [
      ...new Set(
        [...clustersResult.rows, ...factoriesResult.rows].flatMap((row) => [
          ...(Array.isArray(row.categoryIds)
            ? row.categoryIds.map(String)
            : []),
          ...(row.primaryCategoryId === undefined
            ? []
            : [String(row.primaryCategoryId)]),
        ]),
      ),
    ];
    const regionsResult = await pool.query(
      `with recursive selected as (
        select * from regions where id = any($1::text[])
        union
        select parent.* from regions parent
        join selected child on child.parent_id = parent.id
      )
      select id, level::text, parent_id as "parentId", name,
        ST_AsGeoJSON(centroid)::jsonb as centroid,
        case when boundary is null then null
          else ST_AsGeoJSON(boundary)::jsonb end as boundary
      from selected order by level, id`,
      [regionIds],
    );
    const categoriesResult = await pool.query(
      `with recursive selected as (
        select * from categories where id = any($1::text[])
        union
        select parent.* from categories parent
        join selected child on child.parent_id = parent.id
      )
      select id, parent_id as "parentId", name, slug, icon, color, aliases,
        sort_order as "sortOrder", search_text_en as "searchTextEn",
        search_text_zh as "searchTextZh"
      from selected order by parent_id nulls first, slug`,
      [categoryIds],
    );
    const articlesResult = await pool.query(
      `select id, title, slug, locale::text, cover_id as "coverId", body,
        published_at as "publishedAt", _status::text
      from articles where slug = any($1::text[]) order by slug`,
      [curation.guideSlugs],
    );
    assertExactSelection(
      articlesResult.rows.map((row) => String(row.slug)),
      curation.guideSlugs,
      "Guide",
    );
    const mediaIds = articlesResult.rows
      .map((row) => row.coverId)
      .filter((value): value is number => typeof value === "number");
    const mediaResult =
      mediaIds.length === 0
        ? { rows: [] }
        : await pool.query(
            `select id, alt, ai_generated as "aiGenerated",
              object_key as "objectKey", prefix, filename,
              mime_type as "mimeType", filesize::int, width::int, height::int,
              focal_x::int as "focalX", focal_y::int as "focalY"
            from media where id = any($1::int[]) order by id`,
            [mediaIds],
          );

    const rawDataset = {
      version: "m5-t8a-dataset-v1",
      exportedAt,
      sourceEnvironment: "staging",
      curation,
      regions: regionsResult.rows,
      categories: categoriesResult.rows,
      clusters: clustersResult.rows,
      factories: factoriesResult.rows,
      articles: articlesResult.rows,
      media: mediaResult.rows,
    };
    const dataset = productionDatasetSchema.parse(
      JSON.parse(JSON.stringify(rawDataset)) as unknown,
    );
    assertNoSyntheticIdentifiers([
      ...dataset.clusters.map(({ slug }) => slug),
      ...dataset.factories.map(({ slug }) => slug),
      ...dataset.articles.map(({ slug }) => slug),
      ...collectMediaKeys(dataset),
    ]);
    const selectedClusterIds = new Set(dataset.clusters.map(({ id }) => id));
    const orphan = dataset.factories.find(
      (factory) =>
        typeof factory.clusterId !== "string" ||
        !selectedClusterIds.has(factory.clusterId),
    );
    if (orphan !== undefined) {
      throw new Error(
        `Factory ${orphan.slug} does not belong to a curated cluster`,
      );
    }
    return dataset;
  } finally {
    await pool.end();
  }
}

async function loadCuration(path: string): Promise<ProductionCuration> {
  const curation = productionCurationSchema.parse(
    JSON.parse(await readFile(path, "utf8")) as unknown,
  );
  assertUnique(curation.clusterSlugs, "Curated cluster slugs");
  assertUnique(curation.factorySlugs, "Curated factory slugs");
  assertUnique(curation.guideSlugs, "Curated guide slugs");
  assertNoSyntheticIdentifiers([
    ...curation.clusterSlugs,
    ...curation.factorySlugs,
    ...curation.guideSlugs,
  ]);
  return curation;
}

export async function validateProductionContentSource(config: {
  curationPath: string;
  databaseUrl: string;
  now?: Date;
}): Promise<ProductionDataset> {
  const curation = await loadCuration(config.curationPath);
  return queryCanonicalDataset(
    config.databaseUrl,
    curation,
    (config.now ?? new Date()).toISOString(),
  );
}

export async function exportProductionContent(config: ExportConfig): Promise<{
  manifest: ProductionContentManifest;
  manifestObjectKey: string;
}> {
  const createdAt = (config.now ?? new Date()).toISOString();
  const curation = await loadCuration(config.curationPath);
  const sourceDataset = await queryCanonicalDataset(
    config.databaseUrl,
    curation,
    createdAt,
  );
  const media = await copyMedia(
    config.sourceStorage,
    config.destinationStorage,
    collectMediaKeys(sourceDataset),
  );
  const dataset = rewriteMediaKeys(sourceDataset);
  const datasetBody = jsonBody(dataset);
  const datasetSha256 = digest(datasetBody);
  const objectRoot = `${MIGRATION_ROOT}/${createdAt.replaceAll(/[:.]/gu, "-")}-${datasetSha256.slice(0, 12)}`;
  const datasetObjectKey = `${objectRoot}/dataset.json`;
  const manifestObjectKey = `${objectRoot}/manifest.json`;
  const manifest = productionContentManifestSchema.parse({
    version: "m5-t8a-manifest-v1",
    createdAt,
    sourceEnvironment: "staging",
    destinationEnvironment: "production",
    dataset: {
      objectKey: datasetObjectKey,
      bytes: Buffer.byteLength(datasetBody),
      sha256: datasetSha256,
    },
    counts: {
      regions: dataset.regions.length,
      categories: dataset.categories.length,
      clusters: dataset.clusters.length,
      factories: dataset.factories.length,
      articles: dataset.articles.length,
      media: dataset.media.length,
    },
    slugs: {
      clusters: dataset.clusters.map(({ slug }) => slug),
      factories: dataset.factories.map(({ slug }) => slug),
      articles: dataset.articles.map(({ slug }) => slug),
    },
    media,
  });
  const storage = createStorageClient(config.destinationStorage);
  await storage.send(
    new PutObjectCommand({
      Bucket: config.destinationStorage.privateBucket,
      Key: datasetObjectKey,
      Body: datasetBody,
      ContentType: DATASET_CONTENT_TYPE,
      Metadata: { sha256: datasetSha256 },
    }),
  );
  await storage.send(
    new PutObjectCommand({
      Bucket: config.destinationStorage.privateBucket,
      Key: manifestObjectKey,
      Body: jsonBody(manifest),
      ContentType: DATASET_CONTENT_TYPE,
    }),
  );
  const datasetHead = await storage.send(
    new HeadObjectCommand({
      Bucket: config.destinationStorage.privateBucket,
      Key: datasetObjectKey,
    }),
  );
  if (
    datasetHead.ContentLength !== manifest.dataset.bytes ||
    datasetHead.Metadata?.sha256 !== manifest.dataset.sha256
  ) {
    throw new Error("Production dataset R2 HEAD verification failed");
  }
  return { manifest, manifestObjectKey };
}

async function insertReferenceData(
  client: PoolClient,
  dataset: ProductionDataset,
): Promise<void> {
  for (const region of dataset.regions) {
    await client.query(
      `insert into regions
        (id, level, parent_id, name, centroid, boundary, updated_at)
      values ($1, $2::region_level, $3, $4::jsonb,
        ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
        case when $6::text is null then null
          else ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($6), 4326)) end,
        now())
      on conflict (id) do update set level=excluded.level,
        parent_id=excluded.parent_id, name=excluded.name,
        centroid=excluded.centroid, boundary=excluded.boundary,
        updated_at=now()`,
      [
        region.id,
        region.level,
        region.parentId ?? null,
        JSON.stringify(region.name),
        JSON.stringify(region.centroid),
        region.boundary === null || region.boundary === undefined
          ? null
          : JSON.stringify(region.boundary),
      ],
    );
  }
  for (const category of dataset.categories) {
    await client.query(
      `insert into categories
        (id, parent_id, name, slug, icon, color, aliases, sort_order,
          search_text_en, search_text_zh, updated_at)
      values ($1,$2,$3::jsonb,$4,$5,$6,$7::jsonb,$8,$9,$10,now())
      on conflict (id) do update set parent_id=excluded.parent_id,
        name=excluded.name, slug=excluded.slug, icon=excluded.icon,
        color=excluded.color, aliases=excluded.aliases,
        sort_order=excluded.sort_order,
        search_text_en=excluded.search_text_en,
        search_text_zh=excluded.search_text_zh, updated_at=now()`,
      [
        category.id,
        category.parentId ?? null,
        JSON.stringify(category.name),
        category.slug,
        category.icon ?? null,
        category.color ?? null,
        JSON.stringify(category.aliases),
        category.sortOrder,
        category.searchTextEn,
        category.searchTextZh,
      ],
    );
  }
}

async function importDatasetDrafts(
  databaseUrl: string,
  dataset: ProductionDataset,
): Promise<void> {
  const pool = new Pool({
    application_name: "chinasupply-m5-t8a-import",
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    max: 1,
  });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await insertReferenceData(client, dataset);
    for (const cluster of dataset.clusters) {
      await client.query(
        `insert into clusters
          (id, slug, name, region_id, primary_category_id, centroid, boundary,
            summary, description, main_products, cover_image, stats, status,
            published_at, search_text_en, search_text_zh, updated_at)
        values ($1,$2,$3::jsonb,$4,$5,
          ST_SetSRID(ST_GeomFromGeoJSON($6),4326),
          case when $7::text is null then null
            else ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($7),4326)) end,
          $8::jsonb,$9::jsonb,$10::jsonb,$11,$12::jsonb,
          'draft',null,$13,$14,now())
        on conflict (id) do update set slug=excluded.slug, name=excluded.name,
          region_id=excluded.region_id,
          primary_category_id=excluded.primary_category_id,
          centroid=excluded.centroid, boundary=excluded.boundary,
          summary=excluded.summary, description=excluded.description,
          main_products=excluded.main_products,
          cover_image=excluded.cover_image, stats=excluded.stats,
          status='draft', published_at=null,
          search_text_en=excluded.search_text_en,
          search_text_zh=excluded.search_text_zh, updated_at=now()`,
        [
          cluster.id,
          cluster.slug,
          JSON.stringify(cluster.name),
          cluster.regionId,
          cluster.primaryCategoryId,
          JSON.stringify(cluster.centroid),
          cluster.boundary === null || cluster.boundary === undefined
            ? null
            : JSON.stringify(cluster.boundary),
          JSON.stringify(cluster.summary),
          cluster.description === null || cluster.description === undefined
            ? null
            : JSON.stringify(cluster.description),
          JSON.stringify(cluster.mainProducts),
          cluster.coverImage,
          cluster.stats === null || cluster.stats === undefined
            ? null
            : JSON.stringify(cluster.stats),
          cluster.searchTextEn,
          cluster.searchTextZh,
        ],
      );
      await client.query("delete from cluster_categories where cluster_id=$1", [
        cluster.id,
      ]);
      for (const categoryId of cluster.categoryIds) {
        await client.query(
          `insert into cluster_categories (cluster_id, category_id)
            values ($1,$2) on conflict do nothing`,
          [cluster.id, categoryId],
        );
      }
    }
    for (const factory of dataset.factories) {
      await client.query(
        `insert into factories
          (id, slug, name, cluster_id, region_id, address, location,
            location_gcj02, main_products, certifications, moq,
            established_year, employee_range, contact, images,
            source_name, source_url, verified, verified_at, last_verified_at,
            verified_by, status, published_at, search_text_en, search_text_zh,
            updated_at)
        values ($1,$2,$3::jsonb,$4,$5,$6::jsonb,
          ST_SetSRID(ST_GeomFromGeoJSON($7),4326),$8::jsonb,$9::jsonb,
          $10::text[],$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,
          false,null,null,null,'draft',null,$18,$19,now())
        on conflict (id) do update set slug=excluded.slug, name=excluded.name,
          cluster_id=excluded.cluster_id, region_id=excluded.region_id,
          address=excluded.address, location=excluded.location,
          location_gcj02=excluded.location_gcj02,
          main_products=excluded.main_products,
          certifications=excluded.certifications, moq=excluded.moq,
          established_year=excluded.established_year,
          employee_range=excluded.employee_range, contact=excluded.contact,
          images=excluded.images, source_name=excluded.source_name,
          source_url=excluded.source_url, verified=false, verified_at=null,
          last_verified_at=null, verified_by=null, status='draft',
          published_at=null, search_text_en=excluded.search_text_en,
          search_text_zh=excluded.search_text_zh, updated_at=now()`,
        [
          factory.id,
          factory.slug,
          JSON.stringify(factory.name),
          factory.clusterId,
          factory.regionId,
          JSON.stringify(factory.address),
          JSON.stringify(factory.location),
          factory.locationGcj02 === null || factory.locationGcj02 === undefined
            ? null
            : JSON.stringify(factory.locationGcj02),
          JSON.stringify(factory.mainProducts),
          factory.certifications,
          factory.moq ?? null,
          factory.establishedYear ?? null,
          factory.employeeRange ?? null,
          factory.contact === null || factory.contact === undefined
            ? null
            : JSON.stringify(factory.contact),
          JSON.stringify(factory.images),
          factory.sourceName ?? null,
          factory.sourceUrl ?? null,
          factory.searchTextEn,
          factory.searchTextZh,
        ],
      );
      await client.query("delete from factory_categories where factory_id=$1", [
        factory.id,
      ]);
      for (const categoryId of factory.categoryIds) {
        await client.query(
          `insert into factory_categories (factory_id, category_id)
            values ($1,$2) on conflict do nothing`,
          [factory.id, categoryId],
        );
      }
    }
    for (const medium of dataset.media) {
      await client.query(
        `insert into media
          (id, alt, ai_generated, object_key, prefix, filename, mime_type,
            filesize, width, height, focal_x, focal_y, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
        on conflict (id) do update set alt=excluded.alt,
          ai_generated=excluded.ai_generated, object_key=excluded.object_key,
          prefix=excluded.prefix, filename=excluded.filename,
          mime_type=excluded.mime_type, filesize=excluded.filesize,
          width=excluded.width, height=excluded.height,
          focal_x=excluded.focal_x, focal_y=excluded.focal_y,
          updated_at=now()`,
        [
          medium.id,
          medium.alt,
          medium.aiGenerated,
          medium.objectKey,
          medium.prefix,
          medium.filename,
          medium.mimeType,
          medium.filesize,
          medium.width,
          medium.height,
          medium.focalX,
          medium.focalY,
        ],
      );
    }
    for (const article of dataset.articles) {
      await client.query(
        `insert into articles
          (id, title, slug, locale, cover_id, body, published_at, _status,
            updated_at)
        values ($1,$2,$3,$4,$5,$6::jsonb,null,'draft',now())
        on conflict (id) do update set title=excluded.title,
          slug=excluded.slug, locale=excluded.locale,
          cover_id=excluded.cover_id, body=excluded.body,
          published_at=null, _status='draft', updated_at=now()`,
        [
          article.id,
          article.title,
          article.slug,
          article.locale,
          article.coverId,
          JSON.stringify(article.body),
        ],
      );
      await client.query(
        `insert into _articles_v
          (parent_id, version_title, version_slug, version_locale,
            version_cover_id, version_body, version_published_at,
            version_updated_at, version_created_at, version__status, latest)
        select $1,$2,$3,$4,$5,$6::jsonb,null,now(),now(),'draft',true
        where not exists (
          select 1 from _articles_v where parent_id=$1
        )`,
        [
          article.id,
          article.title,
          article.slug,
          article.locale,
          article.coverId,
          JSON.stringify(article.body),
        ],
      );
    }
    if (dataset.media.length > 0) {
      await client.query(
        `select setval(pg_get_serial_sequence('media','id'),
          greatest((select max(id) from media),1),true)`,
      );
    }
    if (dataset.articles.length > 0) {
      await client.query(
        `select setval(pg_get_serial_sequence('articles','id'),
          greatest((select max(id) from articles),1),true)`,
      );
    }
    const state = await client.query(
      `select
        (select count(*)::int from clusters
          where id=any($1::text[]) and status='draft'
            and published_at is null) as clusters,
        (select count(*)::int from factories
          where id=any($2::text[]) and status='draft'
            and published_at is null and verified=false
            and verified_at is null and verified_by is null) as factories,
        (select count(*)::int from articles
          where id=any($3::int[]) and _status='draft'
            and published_at is null) as articles`,
      [
        dataset.clusters.map(({ id }) => id),
        dataset.factories.map(({ id }) => id),
        dataset.articles.map(({ id }) => id),
      ],
    );
    const row = state.rows[0] as Record<string, number>;
    if (
      row.clusters !== dataset.clusters.length ||
      row.factories !== dataset.factories.length ||
      row.articles !== dataset.articles.length
    ) {
      throw new Error("Production draft-state verification failed");
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function importProductionContent(
  config: ImportConfig,
): Promise<ProductionContentManifest> {
  const storage = createStorageClient(config.storage);
  const manifestObject = await getObjectBuffer(
    storage,
    config.storage.privateBucket,
    config.manifestObjectKey,
  );
  const manifest = productionContentManifestSchema.parse(
    JSON.parse(manifestObject.body.toString("utf8")) as unknown,
  );
  const datasetObject = await getObjectBuffer(
    storage,
    config.storage.privateBucket,
    manifest.dataset.objectKey,
  );
  if (
    datasetObject.body.byteLength !== manifest.dataset.bytes ||
    digest(datasetObject.body) !== manifest.dataset.sha256
  ) {
    throw new Error("Production dataset checksum verification failed");
  }
  const dataset = productionDatasetSchema.parse(
    JSON.parse(datasetObject.body.toString("utf8")) as unknown,
  );
  assertExactSelection(
    dataset.clusters.map(({ slug }) => slug),
    manifest.slugs.clusters,
    "Manifest cluster",
  );
  assertExactSelection(
    dataset.factories.map(({ slug }) => slug),
    manifest.slugs.factories,
    "Manifest factory",
  );
  assertExactSelection(
    dataset.articles.map(({ slug }) => slug),
    manifest.slugs.articles,
    "Manifest article",
  );
  const expectedCounts = {
    regions: dataset.regions.length,
    categories: dataset.categories.length,
    clusters: dataset.clusters.length,
    factories: dataset.factories.length,
    articles: dataset.articles.length,
    media: dataset.media.length,
  };
  if (JSON.stringify(expectedCounts) !== JSON.stringify(manifest.counts)) {
    throw new Error("Production manifest count verification failed");
  }
  for (const medium of manifest.media) {
    const head = await storage.send(
      new HeadObjectCommand({
        Bucket: config.storage.mediaBucket,
        Key: medium.destinationObjectKey,
      }),
    );
    if (
      head.ContentLength !== medium.bytes ||
      head.ContentType !== medium.contentType ||
      head.Metadata?.sha256 !== medium.sha256
    ) {
      throw new Error(
        `Production media verification failed: ${medium.destinationObjectKey}`,
      );
    }
  }
  await importDatasetDrafts(config.databaseUrl, dataset);
  return manifest;
}

export const productionContentInternals = {
  assertExactSelection,
  assertNoSyntheticIdentifiers,
  collectMediaKeys,
  productionObjectKey,
  rewriteMediaKeys,
};

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { parseSeedCliEnv } from "@chinasupply/config/env/api";
import {
  IMPORT_CONTRACT_VERSION,
  buildSearchText,
  importJobDataSchema,
  importJobResultSchema,
  importReportSchema,
  type ImportEntity,
  type ImportReport,
} from "@chinasupply/schemas";
import { Queue, QueueEvents } from "bullmq";
import { inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { nanoid } from "nanoid";
import { Pool } from "pg";

import { createRedisOptions } from "../common/redis/redis-options.js";
import type { CoreDatabase } from "../database/database.service.js";
import { categories, regions } from "../database/schema.js";
import * as coreSchema from "../database/schema.js";
import {
  IMPORT_JOB_ATTEMPTS,
  IMPORT_JOB_BY_ENTITY,
  IMPORT_QUEUE,
} from "../imports/import.constants.js";
import { buildImportObjectKeys } from "../imports/import-object-keys.js";
import { createPrivateObjectStorageClient } from "../imports/private-object-storage.service.js";
import {
  loadRealSeedData,
  type CategorySeedRow,
  type RealSeedData,
} from "./real-seed-data.js";

const IMPORT_TIMEOUT_MS = 10 * 60 * 1_000;

export interface SeedImportEvidence {
  importId: string;
  reportObjectKey: string;
  totals: ImportReport["totals"];
}

export interface RealSeedResult {
  environment: "local" | "staging";
  regions: number;
  categories: number;
  clusters: SeedImportEvidence;
  factories: SeedImportEvidence;
}

export function assertRealSeedEnvironment(
  appEnvironment: string | undefined,
  argumentsList: string[],
): asserts appEnvironment is "local" | "staging" {
  if (appEnvironment === "production") {
    throw new Error("Real seed is forbidden in production");
  }
  if (appEnvironment === "staging") {
    if (
      argumentsList.length !== 1 ||
      argumentsList[0] !== "--confirm-staging"
    ) {
      throw new Error(
        "Staging seed requires the exact --confirm-staging argument",
      );
    }
    return;
  }
  if (appEnvironment === "local") {
    if (argumentsList.length !== 0) {
      throw new Error("Local seed does not accept confirmation arguments");
    }
    return;
  }
  throw new Error("Real seed requires APP_ENV=local or APP_ENV=staging");
}

function categoryValues(category: CategorySeedRow, parentId: string | null) {
  return {
    parentId,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    color: category.color,
    aliases: category.aliases,
    sortOrder: category.sortOrder,
    ...buildSearchText({
      kind: "category" as const,
      name: category.name,
      aliases: category.aliases,
    }),
  };
}

async function upsertReferenceData(
  database: CoreDatabase,
  data: RealSeedData,
): Promise<void> {
  await database.transaction(async (transaction) => {
    for (const region of data.regions) {
      await transaction
        .insert(regions)
        .values({
          id: region.id,
          level: region.level,
          name: region.name,
          centroid: region.centroid,
          boundary:
            region.boundary === null
              ? null
              : sql`ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(region.boundary)}), 4326))`,
        })
        .onConflictDoUpdate({
          target: regions.id,
          set: {
            level: region.level,
            name: region.name,
            centroid: region.centroid,
            boundary:
              region.boundary === null
                ? null
                : sql`ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(region.boundary)}), 4326))`,
            updatedAt: new Date(),
          },
        });
    }

    const seedIds = data.categories.map((category) => category.id);
    const seedSlugs = data.categories.map((category) => category.slug);
    const existingById = await transaction
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(inArray(categories.id, seedIds));
    for (const existing of existingById) {
      const source = data.categories.find(
        (category) => category.id === existing.id,
      );
      if (source !== undefined && source.slug !== existing.slug) {
        throw new Error(
          `Category ID ${existing.id} already belongs to slug ${existing.slug}`,
        );
      }
    }

    const roots = data.categories.filter(
      (category) => category.parentSlug === null,
    );
    for (const category of roots) {
      await transaction
        .insert(categories)
        .values({
          id: category.id,
          ...categoryValues(category, null),
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            ...categoryValues(category, null),
            updatedAt: new Date(),
          },
        });
    }

    const rootRows = await transaction
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(inArray(categories.slug, seedSlugs));
    const categoryIdsBySlug = new Map(
      rootRows.map((category) => [category.slug, category.id]),
    );

    for (const category of data.categories) {
      if (category.parentSlug === null) {
        continue;
      }
      const parentId = categoryIdsBySlug.get(category.parentSlug);
      if (parentId === undefined) {
        throw new Error(
          `Could not resolve parent category ${category.parentSlug}`,
        );
      }
      await transaction
        .insert(categories)
        .values({
          id: category.id,
          ...categoryValues(category, parentId),
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            ...categoryValues(category, parentId),
            updatedAt: new Date(),
          },
        });
    }
  });
}

async function readReport(
  client: ReturnType<typeof createPrivateObjectStorageClient>,
  bucket: string,
  objectKey: string,
): Promise<ImportReport> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
  );
  if (response.Body === undefined) {
    throw new Error(`Import report has no body: ${objectKey}`);
  }
  return importReportSchema.parse(
    JSON.parse(await response.Body.transformToString()) as unknown,
  );
}

async function enqueueAndWait(
  entity: ImportEntity,
  rows: unknown[],
  config: ReturnType<typeof parseSeedCliEnv>,
  queue: Queue,
  events: QueueEvents,
  storage: ReturnType<typeof createPrivateObjectStorageClient>,
): Promise<SeedImportEvidence> {
  const importId = nanoid(21);
  const objectKeys = buildImportObjectKeys({
    prefix: config.R2_PREFIX,
    entity,
    importId,
    sourceFormat: "json",
  });
  const jobData = importJobDataSchema.parse({
    version: IMPORT_CONTRACT_VERSION,
    importId,
    entity,
    sourceFormat: "json",
    sourceCoordinateSystem: "wgs84",
    ...objectKeys,
  });
  const body = `${JSON.stringify(
    { version: IMPORT_CONTRACT_VERSION, rows },
    null,
    2,
  )}\n`;
  await storage.send(
    new PutObjectCommand({
      Bucket: config.R2_PRIVATE_BUCKET,
      Key: objectKeys.sourceObjectKey,
      Body: body,
      ContentType: "application/json",
    }),
  );
  const job = await queue.add(IMPORT_JOB_BY_ENTITY[entity], jobData, {
    jobId: importId,
    attempts: IMPORT_JOB_ATTEMPTS,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1_000 },
  });
  const result = importJobResultSchema.parse(
    await job.waitUntilFinished(events, IMPORT_TIMEOUT_MS),
  );
  const report = await readReport(
    storage,
    config.R2_PRIVATE_BUCKET,
    result.reportObjectKey,
  );
  if (report.fatal !== null || report.totals.failed !== 0) {
    throw new Error(
      `${entity} seed import failed; inspect ${report.reportObjectKey}`,
    );
  }
  return {
    importId,
    reportObjectKey: report.reportObjectKey,
    totals: report.totals,
  };
}

export async function runRealSeed(input: {
  environment?: NodeJS.ProcessEnv;
  argumentsList?: string[];
  seedDirectory: string;
}): Promise<RealSeedResult> {
  const environment = input.environment ?? process.env;
  const argumentsList = input.argumentsList ?? process.argv.slice(2);
  const appEnvironment = environment.APP_ENV;
  assertRealSeedEnvironment(appEnvironment, argumentsList);
  const config = parseSeedCliEnv(environment);
  const data = await loadRealSeedData(input.seedDirectory);
  const pool = new Pool({
    application_name: "chinasupply-real-seed",
    connectionString: config.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    max: 2,
  });
  const database = drizzle(pool, { schema: coreSchema });
  const storage = createPrivateObjectStorageClient(config);
  const queue = new Queue(IMPORT_QUEUE, {
    connection: createRedisOptions(config.REDIS_URL, 1),
  });
  const events = new QueueEvents(IMPORT_QUEUE, {
    connection: createRedisOptions(config.REDIS_URL, null),
  });

  try {
    await events.waitUntilReady();
    await upsertReferenceData(database, data);
    const clusterEvidence = await enqueueAndWait(
      "clusters",
      data.clusters,
      config,
      queue,
      events,
      storage,
    );
    const factoryEvidence = await enqueueAndWait(
      "factories",
      data.factories,
      config,
      queue,
      events,
      storage,
    );
    return {
      environment: appEnvironment,
      regions: data.regions.length,
      categories: data.categories.length,
      clusters: clusterEvidence,
      factories: factoryEvidence,
    };
  } finally {
    await Promise.allSettled([events.close(), queue.close(), pool.end()]);
    storage.destroy();
  }
}

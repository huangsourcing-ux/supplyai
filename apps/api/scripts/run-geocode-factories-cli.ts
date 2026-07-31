import "reflect-metadata";

import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { parseImportCliEnv } from "@chinasupply/config/env/api";
import {
  IMPORT_CONTRACT_VERSION,
  geocodeFactoriesJobDataSchema,
  type ImportSourceFormat,
} from "@chinasupply/schemas";
import { Queue } from "bullmq";
import { nanoid } from "nanoid";

import { createRedisOptions } from "../src/common/redis/redis-options.js";
import {
  GEOCODE_FACTORIES_JOB,
  IMPORT_JOB_ATTEMPTS,
  IMPORT_QUEUE,
} from "../src/imports/import.constants.js";
import { buildGeocodeFactoriesObjectKeys } from "../src/imports/import-object-keys.js";
import { createPrivateObjectStorageClient } from "../src/imports/private-object-storage.service.js";

const USAGE =
  "Usage: pnpm --filter @chinasupply/api geocode:factories -- <file.csv|file.json>";

function parseArguments(argumentsList: string[]): string {
  const filePath = argumentsList[0];
  if (
    argumentsList.length !== 1 ||
    filePath === undefined ||
    filePath.startsWith("-")
  ) {
    throw new Error(USAGE);
  }
  return resolve(filePath);
}

function sourceFormat(filePath: string): ImportSourceFormat {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".csv") {
    return "csv";
  }
  if (extension === ".json") {
    return "json";
  }
  throw new Error("Geocoding source must use a .csv or .json extension");
}

export async function runGeocodeFactoriesCli(
  argumentsList = process.argv.slice(2),
): Promise<void> {
  const config = parseImportCliEnv(process.env);
  const filePath = parseArguments(argumentsList);
  const format = sourceFormat(filePath);
  const body = await readFile(filePath);
  const geocodeId = nanoid(21);
  const objectKeys = buildGeocodeFactoriesObjectKeys({
    prefix: config.R2_PREFIX,
    geocodeId,
    sourceFormat: format,
  });
  const jobData = geocodeFactoriesJobDataSchema.parse({
    version: IMPORT_CONTRACT_VERSION,
    geocodeId,
    sourceFormat: format,
    ...objectKeys,
  });
  const storage = createPrivateObjectStorageClient(config);
  const queue = new Queue(IMPORT_QUEUE, {
    connection: createRedisOptions(config.REDIS_URL, 1),
  });

  try {
    await storage.send(
      new PutObjectCommand({
        Bucket: config.R2_PRIVATE_BUCKET,
        Key: objectKeys.sourceObjectKey,
        Body: body,
        ContentType: format === "csv" ? "text/csv" : "application/json",
      }),
    );
    await queue.add(GEOCODE_FACTORIES_JOB, jobData, {
      jobId: geocodeId,
      attempts: IMPORT_JOB_ATTEMPTS,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 1_000 },
    });
    console.log(
      JSON.stringify({
        jobId: geocodeId,
        sourceObjectKey: objectKeys.sourceObjectKey,
        reportObjectKey: objectKeys.reportObjectKey,
      }),
    );
  } finally {
    await queue.close();
    storage.destroy();
  }
}

import "reflect-metadata";

import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { parseImportCliEnv } from "@chinasupply/config/env/api";
import {
  IMPORT_CONTRACT_VERSION,
  importJobDataSchema,
  sourceCoordinateSystemSchema,
  type ImportEntity,
  type ImportSourceFormat,
} from "@chinasupply/schemas";
import { Queue } from "bullmq";
import { nanoid } from "nanoid";

import { createRedisOptions } from "../src/common/redis/redis-options.js";
import {
  IMPORT_JOB_ATTEMPTS,
  IMPORT_JOB_BY_ENTITY,
  IMPORT_QUEUE,
} from "../src/imports/import.constants.js";
import { buildImportObjectKeys } from "../src/imports/import-object-keys.js";
import { createPrivateObjectStorageClient } from "../src/imports/private-object-storage.service.js";

function usage(entity: ImportEntity): string {
  return `Usage: pnpm --filter @chinasupply/api import:${entity} -- <file.csv|file.json> --source-coordinate-system <wgs84|gcj02>`;
}

function parseArguments(
  entity: ImportEntity,
  argumentsList: string[],
): {
  filePath: string;
  sourceCoordinateSystem: "wgs84" | "gcj02";
} {
  const flagIndex = argumentsList.indexOf("--source-coordinate-system");
  const filePath = argumentsList.find((argument) => !argument.startsWith("-"));
  const coordinateValue =
    flagIndex === -1 ? undefined : argumentsList[flagIndex + 1];
  const coordinateResult =
    sourceCoordinateSystemSchema.safeParse(coordinateValue);

  if (
    filePath === undefined ||
    flagIndex === -1 ||
    !coordinateResult.success ||
    argumentsList.length !== 3
  ) {
    throw new Error(usage(entity));
  }

  return {
    filePath: resolve(filePath),
    sourceCoordinateSystem: coordinateResult.data,
  };
}

function sourceFormat(filePath: string): ImportSourceFormat {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".csv") {
    return "csv";
  }
  if (extension === ".json") {
    return "json";
  }
  throw new Error("Import source must use a .csv or .json extension");
}

export async function runImportCli(
  entity: ImportEntity,
  argumentsList = process.argv.slice(2),
): Promise<void> {
  const config = parseImportCliEnv(process.env);
  const argumentsValue = parseArguments(entity, argumentsList);
  const format = sourceFormat(argumentsValue.filePath);
  const body = await readFile(argumentsValue.filePath);
  const importId = nanoid(21);
  const objectKeys = buildImportObjectKeys({
    prefix: config.R2_PREFIX,
    entity,
    importId,
    sourceFormat: format,
  });
  const jobData = importJobDataSchema.parse({
    version: IMPORT_CONTRACT_VERSION,
    importId,
    entity,
    sourceFormat: format,
    sourceCoordinateSystem: argumentsValue.sourceCoordinateSystem,
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
    await queue.add(IMPORT_JOB_BY_ENTITY[entity], jobData, {
      jobId: importId,
      attempts: IMPORT_JOB_ATTEMPTS,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 1_000 },
    });
    console.log(
      JSON.stringify({
        jobId: importId,
        sourceObjectKey: objectKeys.sourceObjectKey,
        reportObjectKey: objectKeys.reportObjectKey,
      }),
    );
  } finally {
    await queue.close();
    storage.destroy();
  }
}

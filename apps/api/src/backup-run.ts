import "reflect-metadata";

import { parseBackupRunCliEnv } from "@chinasupply/config/env/api";
import { Job, Queue, QueueEvents } from "bullmq";
import { nanoid } from "nanoid";

import {
  BACKUP_ATTEMPTS,
  BACKUP_DAILY_JOB,
  BACKUP_TIMEOUT_MS,
  MAINTENANCE_QUEUE,
} from "./backups/backup.constants.js";
import {
  backupJobResultSchema,
  type BackupJobResult,
} from "./backups/backup.schemas.js";
import { createRedisOptions } from "./common/redis/redis-options.js";

function assertConfirmation(
  environment: "local" | "staging" | "production",
  arguments_: readonly string[],
): void {
  const expected =
    environment === "production"
      ? "--confirm-production"
      : environment === "staging"
        ? "--confirm-staging"
        : "--confirm-local";
  if (arguments_.length !== 1 || arguments_[0] !== expected) {
    throw new Error(`Manual ${environment} backup requires ${expected}`);
  }
}

async function run(): Promise<void> {
  const config = parseBackupRunCliEnv(process.env);
  assertConfirmation(config.APP_ENV, process.argv.slice(2));
  const connection = createRedisOptions(config.REDIS_URL, null);
  const queue = new Queue(MAINTENANCE_QUEUE, { connection });
  const events = new QueueEvents(MAINTENANCE_QUEUE, {
    connection: createRedisOptions(config.REDIS_URL, null),
  });

  try {
    await events.waitUntilReady();
    const job: Job = await queue.add(
      BACKUP_DAILY_JOB,
      { version: 1, trigger: "manual" },
      {
        jobId: `backup-${nanoid(21)}`,
        attempts: BACKUP_ATTEMPTS,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: { count: 31 },
        removeOnFail: { count: 100 },
      },
    );
    const result: BackupJobResult = backupJobResultSchema.parse(
      await job.waitUntilFinished(
        events,
        BACKUP_TIMEOUT_MS * BACKUP_ATTEMPTS + 5 * 60 * 1_000,
      ),
    );
    console.log(
      JSON.stringify({
        jobId: job.id,
        objectKey: result.objectKey,
        bytes: result.bytes,
        sha256: result.sha256,
        status: "completed",
      }),
    );
  } finally {
    await Promise.allSettled([events.close(), queue.close()]);
  }
}

await run();

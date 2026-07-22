import "reflect-metadata";

import { parseApiRuntimeEnv } from "@chinasupply/config/env/api";
import { Job, Queue, QueueEvents } from "bullmq";

import { createRedisOptions } from "./common/redis/redis-options.js";
import { SYSTEM_PING_JOB, SYSTEM_QUEUE } from "./queue/system.constants.js";
import type { SystemPingResult } from "./queue/system.processor.js";

const PING_TIMEOUT_MS = 15_000;

async function run(): Promise<void> {
  const config = parseApiRuntimeEnv(process.env);
  const queue = new Queue(SYSTEM_QUEUE, {
    connection: createRedisOptions(config.REDIS_URL, 1),
  });
  const events = new QueueEvents(SYSTEM_QUEUE, {
    connection: createRedisOptions(config.REDIS_URL, null),
  });

  try {
    await events.waitUntilReady();
    const job: Job = await queue.add(
      SYSTEM_PING_JOB,
      { sentAt: new Date().toISOString() },
      { removeOnComplete: 20, removeOnFail: 50 },
    );
    const result = (await job.waitUntilFinished(
      events,
      PING_TIMEOUT_MS,
    )) as SystemPingResult;

    if (result.ok !== true) {
      throw new Error("system:ping returned an invalid result");
    }

    console.log(
      JSON.stringify({
        jobId: job.id,
        name: job.name,
        processedAt: result.processedAt,
        status: "completed",
      }),
    );
  } finally {
    await Promise.allSettled([events.close(), queue.close()]);
  }
}

await run();

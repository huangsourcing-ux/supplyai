import { coreIdSchema } from "@chinasupply/schemas";
import type { Queue } from "bullmq";
import { z } from "zod";

import { REGENERATE_SEARCH_TEXT_JOB } from "./system.constants.js";

export const searchTextRegenerationJobDataSchema = z.strictObject({
  categoryIds: z
    .array(coreIdSchema)
    .min(1)
    .max(100)
    .refine((values) => new Set(values).size === values.length, {
      message: "categoryIds must not contain duplicates",
    }),
});

export const searchTextRegenerationJobResultSchema = z.strictObject({
  categoriesRegenerated: z.number().int().nonnegative(),
  clustersRegenerated: z.number().int().nonnegative(),
  factoriesRegenerated: z.number().int().nonnegative(),
});

export type SearchTextRegenerationJobData = z.output<
  typeof searchTextRegenerationJobDataSchema
>;
export type SearchTextRegenerationJobResult = z.output<
  typeof searchTextRegenerationJobResultSchema
>;

type SearchTextQueue = Pick<
  Queue<SearchTextRegenerationJobData, SearchTextRegenerationJobResult>,
  "add"
>;

export async function enqueueSearchTextRegeneration(
  queue: SearchTextQueue,
  categoryIds: readonly string[],
) {
  const data = searchTextRegenerationJobDataSchema.parse({
    categoryIds: [...new Set(categoryIds)],
  });
  return queue.add(REGENERATE_SEARCH_TEXT_JOB, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1_000 },
  });
}

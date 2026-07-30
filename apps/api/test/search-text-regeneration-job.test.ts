import type { Queue } from "bullmq";
import { describe, expect, it, vi } from "vitest";

import {
  enqueueSearchTextRegeneration,
  type SearchTextRegenerationJobData,
  type SearchTextRegenerationJobResult,
} from "../src/queue/search-text-regeneration.job.js";
import { REGENERATE_SEARCH_TEXT_JOB } from "../src/queue/system.constants.js";

describe("enqueueSearchTextRegeneration", () => {
  it("deduplicates category IDs and applies durable retry settings", async () => {
    const add = vi.fn().mockResolvedValue({ id: "job-1" });
    const queue = {
      add,
    } as unknown as Pick<
      Queue<SearchTextRegenerationJobData, SearchTextRegenerationJobResult>,
      "add"
    >;

    await enqueueSearchTextRegeneration(queue, [
      "category0000000000000",
      "category0000000000000",
      "category0000000000001",
    ]);

    expect(add).toHaveBeenCalledWith(
      REGENERATE_SEARCH_TEXT_JOB,
      {
        categoryIds: ["category0000000000000", "category0000000000001"],
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 1_000 },
      },
    );
  });

  it("rejects an empty category set before queueing", async () => {
    const add = vi.fn();
    const queue = { add } as unknown as Pick<
      Queue<SearchTextRegenerationJobData, SearchTextRegenerationJobResult>,
      "add"
    >;

    await expect(enqueueSearchTextRegeneration(queue, [])).rejects.toThrow();
    expect(add).not.toHaveBeenCalled();
  });
});

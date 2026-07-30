import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchTextRegenerationService } from "../src/queue/search-text-regeneration.service.js";
import {
  REGENERATE_SEARCH_TEXT_JOB,
  SYSTEM_PING_JOB,
} from "../src/queue/system.constants.js";
import { SystemProcessor } from "../src/queue/system.processor.js";

function job(name: string, data: unknown): Job<unknown> {
  return { data, id: "job-1", name } as Job<unknown>;
}

describe("SystemProcessor", () => {
  const regenerate = vi.fn<SearchTextRegenerationService["regenerate"]>();
  const processor = new SystemProcessor({
    regenerate,
  } as unknown as SearchTextRegenerationService);

  beforeEach(() => {
    regenerate.mockReset();
  });

  it("processes a valid system:ping job", async () => {
    await expect(
      processor.process(
        job(SYSTEM_PING_JOB, { sentAt: new Date().toISOString() }),
      ),
    ).resolves.toMatchObject({ ok: true });
  });

  it("processes regenerate:search-text with validated data", async () => {
    regenerate.mockResolvedValue({
      categoriesRegenerated: 1,
      clustersRegenerated: 2,
      factoriesRegenerated: 3,
    });

    await expect(
      processor.process(
        job(REGENERATE_SEARCH_TEXT_JOB, {
          categoryIds: ["category0000000000000"],
        }),
      ),
    ).resolves.toEqual({
      categoriesRegenerated: 1,
      clustersRegenerated: 2,
      factoriesRegenerated: 3,
    });
    expect(regenerate).toHaveBeenCalledWith({
      categoryIds: ["category0000000000000"],
    });
  });

  it("fails unknown jobs and invalid ping payloads", async () => {
    await expect(processor.process(job("other", {}))).rejects.toThrow(
      /Unsupported system job/,
    );
    await expect(processor.process(job(SYSTEM_PING_JOB, {}))).rejects.toThrow();
    await expect(
      processor.process(job(REGENERATE_SEARCH_TEXT_JOB, { categoryIds: [] })),
    ).rejects.toThrow();
  });
});

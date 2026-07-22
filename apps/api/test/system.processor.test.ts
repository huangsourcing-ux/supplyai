import type { Job } from "bullmq";
import { describe, expect, it } from "vitest";

import { SYSTEM_PING_JOB } from "../src/queue/system.constants.js";
import { SystemProcessor } from "../src/queue/system.processor.js";

function job(name: string, data: unknown): Job<unknown> {
  return { data, id: "job-1", name } as Job<unknown>;
}

describe("SystemProcessor", () => {
  const processor = new SystemProcessor();

  it("processes a valid system:ping job", async () => {
    await expect(
      processor.process(
        job(SYSTEM_PING_JOB, { sentAt: new Date().toISOString() }),
      ),
    ).resolves.toMatchObject({ ok: true });
  });

  it("fails unknown jobs and invalid ping payloads", async () => {
    await expect(processor.process(job("other", {}))).rejects.toThrow(
      /Unsupported system job/,
    );
    await expect(processor.process(job(SYSTEM_PING_JOB, {}))).rejects.toThrow();
  });
});

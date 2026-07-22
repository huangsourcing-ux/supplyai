import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(testDirectory, "../../..");

test("migration workflow is reusable only and never deploys applications", async () => {
  const source = await readFile(
    resolve(workspaceRoot, ".github/workflows/release-migrations.yml"),
    "utf8",
  );
  const workflow = parse(source);

  assert.deepEqual(Object.keys(workflow.on), ["workflow_call"]);
  assert.ok(workflow.jobs.migrate.environment);
  assert.match(source, /release:migrate:core/);
  assert.match(source, /release:migrate:cms/);
  assert.doesNotMatch(source, /\bdeploy\b/i);
  assert.doesNotMatch(source, /workflow_dispatch|\bpush:/);
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getMigrationCommand,
  MIGRATION_TARGETS,
} from "../../../scripts/migration-contract.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(testDirectory, "../../..");
const migrationRunner = resolve(workspaceRoot, "scripts/run-migrations.mjs");

test("migration targets remain separated by schema owner", () => {
  assert.deepEqual(Object.keys(MIGRATION_TARGETS).sort(), ["cms", "core"]);
  assert.equal(getMigrationCommand("core").owner, "Drizzle/NestJS");
  assert.equal(getMigrationCommand("cms").owner, "Payload");
  assert.throws(() => getMigrationCommand("all"), /core, cms/);
});

test("dry-run prints mapped commands without requiring a database", () => {
  for (const [target, expectedCommand] of [
    ["core", /@chinasupply\/api db:migrate/],
    ["cms", /@chinasupply\/web cms:migrate/],
  ]) {
    const result = spawnSync(
      process.execPath,
      [migrationRunner, target, "--dry-run"],
      { cwd: workspaceRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, expectedCommand);
    assert.equal(result.stderr, "");
  }
});

test("invalid migration targets fail before execution", () => {
  const result = spawnSync(
    process.execPath,
    [migrationRunner, "combined", "--dry-run"],
    { cwd: workspaceRoot, encoding: "utf8" },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /core, cms/);
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
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

test("core target is a real Drizzle migration and remains inside its schema boundary", async () => {
  const apiPackage = JSON.parse(
    await readFile(resolve(workspaceRoot, "apps/api/package.json"), "utf8"),
  );
  const migrationSource = await readFile(
    resolve(workspaceRoot, "apps/api/drizzle/0000_initial_core.sql"),
    "utf8",
  );

  assert.match(
    apiPackage.scripts["db:migrate"],
    /drizzle-kit\/bin\.cjs migrate/,
  );
  assert.match(migrationSource, /CREATE TABLE "clusters"/);
  assert.match(migrationSource, /CREATE EXTENSION IF NOT EXISTS postgis/);
  assert.doesNotMatch(
    migrationSource,
    /(?:CREATE|ALTER|DROP)\s+TABLE\s+"?(?:cms_users|payload_\w+)"?/i,
  );
});

import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertDistinctDatabaseTargets,
  assertRestorePostgresMajors,
  assertSecureIdentityFile,
} from "../src/backups/backup-restore.js";

describe("backup restore safety", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it("rejects the same target even when credentials differ", () => {
    expect(() =>
      assertDistinctDatabaseTargets(
        "postgres://source:one@db.internal:5432/app?sslmode=require",
        "postgres://restore:two@DB.INTERNAL/app",
      ),
    ).toThrow(/must differ/);
    expect(() =>
      assertDistinctDatabaseTargets(
        "postgres://source:one@db.internal/app",
        "postgres://restore:two@db.internal/isolated",
      ),
    ).not.toThrow();
  });

  it("requires PostgreSQL 17 on both sides", () => {
    expect(() => assertRestorePostgresMajors(17, 17)).not.toThrow();
    expect(() => assertRestorePostgresMajors(16, 17)).toThrow(/PostgreSQL 17/);
    expect(() => assertRestorePostgresMajors(17, 18)).toThrow(/PostgreSQL 17/);
  });

  it("requires an absolute 0600 identity file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "backup-identity-test-"));
    directories.push(directory);
    const identity = join(directory, "identity.agekey");
    await writeFile(identity, "AGE-SECRET-KEY-TEST", { mode: 0o600 });
    await expect(assertSecureIdentityFile(identity)).resolves.toBe(identity);
    await chmod(identity, 0o640);
    await expect(assertSecureIdentityFile(identity)).rejects.toThrow(
      /group or other/,
    );
    await expect(assertSecureIdentityFile("relative.agekey")).rejects.toThrow(
      /absolute/,
    );
  });
});

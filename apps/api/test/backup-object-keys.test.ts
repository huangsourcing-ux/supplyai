import { describe, expect, it } from "vitest";

import {
  assertBackupManifestObjectKey,
  buildBackupObjectKeys,
  buildBackupPrefix,
  selectExpiredBackupObjectKeys,
} from "../src/backups/backup-object-keys.js";
import { BACKUP_RETENTION_MS } from "../src/backups/backup.constants.js";

describe("backup object namespace and retention", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("builds deterministic environment-scoped UTC object pairs", () => {
    expect(
      buildBackupObjectKeys({
        prefix: "staging",
        createdAt: new Date("2026-07-30T03:00:00.123Z"),
      }),
    ).toEqual({
      objectKey:
        "staging/backups/postgres/2026/07/30/2026-07-30T03-00-00-123Z.dump.age",
      manifestObjectKey:
        "staging/backups/postgres/2026/07/30/2026-07-30T03-00-00-123Z.manifest.json",
    });
    expect(buildBackupPrefix("")).toBe("backups/postgres/");
  });

  it("rejects manifests outside the exact environment backup namespace", () => {
    expect(() =>
      assertBackupManifestObjectKey(
        "staging",
        "staging/backups/postgres/2026/07/30/x.manifest.json",
      ),
    ).not.toThrow();
    for (const key of [
      "production/backups/postgres/x.manifest.json",
      "staging/imports/x.manifest.json",
      "staging/backups/postgres/../reports/x.manifest.json",
      "staging/backups/postgres/x.dump.age",
    ]) {
      expect(() => assertBackupManifestObjectKey("staging", key)).toThrow(
        /outside the backup namespace/,
      );
    }
  });

  it("deletes 31-day objects but keeps exact 30-day and 29-day objects", () => {
    const date = (age: number) =>
      new Date(now.getTime() - age * 24 * 60 * 60 * 1_000);
    expect(
      selectExpiredBackupObjectKeys(
        [
          {
            key: "staging/backups/postgres/31.dump.age",
            lastModified: date(31),
          },
          {
            key: "staging/backups/postgres/30.dump.age",
            lastModified: date(30),
          },
          {
            key: "staging/backups/postgres/29.dump.age",
            lastModified: date(29),
          },
          {
            key: "staging/imports/old.csv",
            lastModified: date(31),
          },
          {
            key: "production/backups/postgres/old.dump.age",
            lastModified: date(31),
          },
          {
            key: "staging/backups/postgres/operator-note.txt",
            lastModified: date(31),
          },
        ],
        {
          prefix: "staging",
          now,
          retentionMs: BACKUP_RETENTION_MS,
        },
      ),
    ).toEqual(["staging/backups/postgres/31.dump.age"]);
  });
});

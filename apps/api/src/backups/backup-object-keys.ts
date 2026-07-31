function withPrefix(prefix: string, key: string): string {
  return prefix.length === 0 ? key : `${prefix}/${key}`;
}

function backupTimestamp(date: Date): string {
  return date.toISOString().replaceAll(":", "-").replace(".", "-");
}

export function buildBackupPrefix(prefix: string): string {
  return withPrefix(prefix, "backups/postgres/");
}

export function buildBackupObjectKeys(input: {
  prefix: string;
  createdAt: Date;
}): { manifestObjectKey: string; objectKey: string } {
  const year = input.createdAt.getUTCFullYear().toString().padStart(4, "0");
  const month = (input.createdAt.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = input.createdAt.getUTCDate().toString().padStart(2, "0");
  const base = `backups/postgres/${year}/${month}/${day}/${backupTimestamp(input.createdAt)}`;
  return {
    objectKey: withPrefix(input.prefix, `${base}.dump.age`),
    manifestObjectKey: withPrefix(input.prefix, `${base}.manifest.json`),
  };
}

export function assertBackupManifestObjectKey(
  prefix: string,
  objectKey: string,
): void {
  const expectedPrefix = buildBackupPrefix(prefix);
  if (
    !objectKey.startsWith(expectedPrefix) ||
    !objectKey.endsWith(".manifest.json") ||
    objectKey.includes("..")
  ) {
    throw new Error("Manifest object key is outside the backup namespace");
  }
}

export function selectExpiredBackupObjectKeys(
  objects: readonly { key: string; lastModified: Date }[],
  input: { prefix: string; now: Date; retentionMs: number },
): string[] {
  const expectedPrefix = buildBackupPrefix(input.prefix);
  const cutoff = input.now.getTime() - input.retentionMs;
  return objects
    .filter(
      (object) =>
        object.key.startsWith(expectedPrefix) &&
        (object.key.endsWith(".dump.age") ||
          object.key.endsWith(".manifest.json")) &&
        object.lastModified.getTime() < cutoff,
    )
    .map((object) => object.key)
    .sort();
}

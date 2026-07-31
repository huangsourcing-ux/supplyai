import { z } from "zod";

import { BACKUP_MANIFEST_VERSION } from "./backup.constants.js";

export const backupJobDataSchema = z
  .object({
    version: z.literal(1),
    trigger: z.enum(["manual", "scheduled"]),
  })
  .strict();

export type BackupJobData = z.infer<typeof backupJobDataSchema>;

export const backupManifestSchema = z
  .object({
    version: z.literal(BACKUP_MANIFEST_VERSION),
    environment: z.enum(["local", "staging", "production"]),
    createdAt: z.iso.datetime({ offset: true }),
    trigger: z.enum(["manual", "scheduled"]),
    sourceCommit: z.string().min(1),
    archive: z
      .object({
        format: z.literal("postgres-custom"),
        postgresServerMajor: z.literal(17),
        pgDumpVersion: z.string().min(1),
        pgRestoreVersion: z.string().min(1),
      })
      .strict(),
    encryption: z
      .object({
        ageVersion: z.string().min(1),
        format: z.literal("age-x25519"),
      })
      .strict(),
    object: z
      .object({
        key: z.string().min(1),
        bytes: z.number().int().positive(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
  })
  .strict();

export type BackupManifest = z.infer<typeof backupManifestSchema>;

export const backupJobResultSchema = z
  .object({
    objectKey: z.string().min(1),
    manifestObjectKey: z.string().min(1),
    bytes: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    deletedExpiredObjects: z.number().int().nonnegative(),
  })
  .strict();

export type BackupJobResult = z.infer<typeof backupJobResultSchema>;

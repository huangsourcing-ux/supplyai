import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  factoryImportJsonDocumentSchema,
  factoryImportRowSchema,
} from "@chinasupply/schemas";
import { describe, expect, it } from "vitest";

import {
  LOAD_DATA_GENERATOR_VERSION,
  serializeSyntheticFactoryDocument,
  syntheticDataDigest,
  type LoadDataCount,
} from "../src/seeds/generate-load-data.js";
import { loadRealSeedData } from "../src/seeds/real-seed-data.js";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const seedDirectory = resolve(workspaceRoot, "data/staging/real-seed");

interface Manifest {
  algorithmVersion: number;
  files: Array<{
    bytes: number;
    count: LoadDataCount;
    path: string;
    sha256: string;
  }>;
}

describe("M1-T8 synthetic load generator", () => {
  it.each([5_000, 20_000] as const)(
    "rebuilds the %i-row manifest artifact deterministically",
    async (count) => {
      const [seed, rawManifest] = await Promise.all([
        loadRealSeedData(seedDirectory),
        readFile(resolve(workspaceRoot, "data/load/manifest.json"), "utf8"),
      ]);
      const manifest = JSON.parse(rawManifest) as Manifest;
      const content = serializeSyntheticFactoryDocument(count, seed);
      const repeatedContent = serializeSyntheticFactoryDocument(count, seed);
      const rawDocument = factoryImportJsonDocumentSchema.parse(
        JSON.parse(content) as unknown,
      );
      const rows = rawDocument.rows.map((row) =>
        factoryImportRowSchema.parse(row),
      );
      const entry = manifest.files.find((file) => file.count === count);

      expect(content).toBe(repeatedContent);
      expect(rows).toHaveLength(count);
      expect(new Set(rows.map(({ slug }) => slug)).size).toBe(count);
      expect(entry).toBeDefined();
      expect(manifest.algorithmVersion).toBe(LOAD_DATA_GENERATOR_VERSION);
      expect(Buffer.byteLength(content)).toBe(entry?.bytes);
      expect(syntheticDataDigest(content)).toBe(entry?.sha256);

      for (const row of rows) {
        expect(row.slug).toMatch(
          new RegExp(`^synthetic-m1t8-${count}-\\d{5}$`, "u"),
        );
        expect(row.contact).toBeNull();
        expect(row.images).toEqual([]);
        expect(row.sourceName).toContain("synthetic");
        expect(row.location[0]).toBeGreaterThanOrEqual(-180);
        expect(row.location[0]).toBeLessThanOrEqual(180);
        expect(row.location[1]).toBeGreaterThanOrEqual(-90);
        expect(row.location[1]).toBeLessThanOrEqual(90);
      }
    },
  );
});

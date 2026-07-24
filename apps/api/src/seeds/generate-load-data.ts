import { createHash } from "node:crypto";

import {
  IMPORT_CONTRACT_VERSION,
  factoryImportJsonDocumentSchema,
  factoryImportRowSchema,
  type FactoryImportRow,
} from "@chinasupply/schemas";

import type { RealSeedData } from "./real-seed-data.js";

export const LOAD_DATA_GENERATOR_VERSION = 1;
export const LOAD_DATA_COUNTS = [5_000, 20_000] as const;
const SYNTHETIC_SOURCE_NAME = "M1-T8 deterministic synthetic load fixture";

export type LoadDataCount = (typeof LOAD_DATA_COUNTS)[number];

function hashSeed(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function isLoadDataCount(value: number): value is LoadDataCount {
  return LOAD_DATA_COUNTS.some((count) => count === value);
}

export function generateSyntheticFactoryRows(
  count: LoadDataCount,
  realSeed: RealSeedData,
): FactoryImportRow[] {
  const random = mulberry32(
    hashSeed(`m1-t8-v${LOAD_DATA_GENERATOR_VERSION}-${count}`),
  );

  return Array.from({ length: count }, (_, index) => {
    const cluster = realSeed.clusters[index % realSeed.clusters.length];
    if (cluster === undefined) {
      throw new Error("Real seed must contain at least one cluster");
    }
    const sequence = (index + 1).toString().padStart(5, "0");
    const longitudeOffset = (random() - 0.5) * 0.12;
    const latitudeOffset = (random() - 0.5) * 0.12;
    const row = {
      slug: `synthetic-m1t8-${count}-${sequence}`,
      name: {
        en: `Synthetic Load Factory ${sequence}`,
        zh: `合成负载工厂 ${sequence}`,
      },
      clusterSlug: cluster.slug,
      regionId: cluster.regionId,
      address: {
        en: `Synthetic load-test address ${sequence}`,
        zh: `合成负载测试地址 ${sequence}`,
      },
      location: [
        Number((cluster.centroid[0] + longitudeOffset).toFixed(6)),
        Number((cluster.centroid[1] + latitudeOffset).toFixed(6)),
      ],
      categorySlugs: cluster.categorySlugs,
      mainProducts: cluster.mainProducts,
      certifications: [],
      moq: null,
      establishedYear: null,
      employeeRange: null,
      contact: null,
      images: [],
      sourceName: SYNTHETIC_SOURCE_NAME,
      sourceUrl: null,
    };
    return factoryImportRowSchema.parse(row);
  });
}

export function serializeSyntheticFactoryDocument(
  count: LoadDataCount,
  realSeed: RealSeedData,
): string {
  const document = factoryImportJsonDocumentSchema.parse({
    version: IMPORT_CONTRACT_VERSION,
    rows: generateSyntheticFactoryRows(count, realSeed),
  });
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function syntheticDataDigest(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

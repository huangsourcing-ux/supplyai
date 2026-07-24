import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadRealSeedData } from "../src/seeds/real-seed-data.js";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const seedDirectory = resolve(workspaceRoot, "data/staging/real-seed");

describe("M1-T8 real seed canonical data", () => {
  it("contains exactly ten clusters and five real factories per cluster", async () => {
    const data = await loadRealSeedData(seedDirectory);

    expect(data.clusters).toHaveLength(10);
    expect(data.factories).toHaveLength(50);
    expect(new Set(data.regions.map(({ id }) => id)).size).toBe(
      data.regions.length,
    );
    expect(new Set(data.categories.map(({ id }) => id)).size).toBe(
      data.categories.length,
    );
    expect(new Set(data.categories.map(({ slug }) => slug)).size).toBe(
      data.categories.length,
    );
    expect(new Set(data.clusters.map(({ slug }) => slug)).size).toBe(10);
    expect(new Set(data.factories.map(({ slug }) => slug)).size).toBe(50);

    for (const cluster of data.clusters) {
      expect(
        data.factories.filter(
          ({ clusterSlug }) => clusterSlug === cluster.slug,
        ),
      ).toHaveLength(5);
    }
  });

  it("keeps unverified contact and media fields safe", async () => {
    const data = await loadRealSeedData(seedDirectory);

    for (const factory of data.factories) {
      expect(factory.slug).not.toMatch(/^synthetic-/u);
      expect(factory.images).toEqual([]);
      expect(factory.sourceUrl).toMatch(/^https:\/\//u);
      expect(factory.contact).not.toBeNull();
      expect(Object.keys(factory.contact ?? {})).toEqual(["website"]);
      expect(factory.contact?.website).toBe(factory.sourceUrl);
      expect(JSON.stringify(factory.contact)).not.toMatch(
        /example\.(com|test)|@|wechat|微信|\+86/u,
      );
    }
    for (const cluster of data.clusters) {
      expect(cluster.coverImage).toBeNull();
    }
  });

  it("has a source-ledger entry for every real cluster and factory", async () => {
    const [data, ledger] = await Promise.all([
      loadRealSeedData(seedDirectory),
      readFile(resolve(workspaceRoot, "data-sources.md"), "utf8"),
    ]);

    for (const record of [...data.clusters, ...data.factories]) {
      expect(ledger).toContain(`\`${record.slug}\``);
    }
    expect(ledger).toContain("real-unverified");
    expect(ledger).toContain("synthetic-test");
    expect(ledger).toContain("ODbL");
    expect(ledger).toContain("1 req/s");
  });
});

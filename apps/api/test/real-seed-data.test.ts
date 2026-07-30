import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadRealSeedData,
  validateRealSeedData,
} from "../src/seeds/real-seed-data.js";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const seedDirectory = resolve(workspaceRoot, "data/staging/real-seed");
const approvedContacts = new Map([
  [
    "nantong-jinkanghong-textile",
    {
      website: "https://en.kifro.com/",
      email: "max.jkh@kifro.com",
      phone: "+86-15262853575",
    },
  ],
  [
    "yiwu-yayu-textile",
    {
      website: "https://ywyayu.com/",
      email: "yayuexport@163.com",
      phone: "+86 17280940617",
      wechat: "yayutextile",
    },
  ],
]);

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

  it("keeps contact and media fields limited to independently reviewed data", async () => {
    const data = await loadRealSeedData(seedDirectory);

    for (const factory of data.factories) {
      expect(factory.slug).not.toMatch(/^synthetic-/u);
      expect(factory.images).toEqual([]);
      expect(factory.sourceUrl).toMatch(/^https:\/\//u);
      expect(factory.contact).not.toBeNull();
      const approvedContact = approvedContacts.get(factory.slug);
      if (approvedContact !== undefined) {
        expect(factory.contact).toEqual(approvedContact);
        continue;
      }
      expect(Object.keys(factory.contact ?? {})).toEqual(["website"]);
      expect(factory.contact?.website).toBe(factory.sourceUrl);
      expect(JSON.stringify(factory.contact)).not.toMatch(
        /example\.(com|test)|@|wechat|微信|\+86/u,
      );
    }
    expect(approvedContacts.size).toBe(2);
    for (const cluster of data.clusters) {
      expect(cluster.coverImage).toBeNull();
    }
  });

  it("rejects contact additions outside the reviewed slug set", async () => {
    const data = await loadRealSeedData(seedDirectory);
    const unreviewedFactory = data.factories.find(
      ({ slug }) => slug === "shenzhen-dji-innovation",
    );

    expect(unreviewedFactory).toBeDefined();
    expect(() =>
      validateRealSeedData({
        ...data,
        factories: data.factories.map((factory) =>
          factory.slug === unreviewedFactory?.slug
            ? {
                ...factory,
                contact: {
                  ...(factory.contact ?? {}),
                  email: "unreviewed@example.test",
                },
              }
            : factory,
        ),
      }),
    ).toThrow(/without an approved SOP review/u);
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

  it("keeps the M2 smoke slice canonical and reviewable", async () => {
    const data = await loadRealSeedData(seedDirectory);
    const smokeClusterSlugs = [
      "dongguan-electronic-information",
      "nantong-home-textiles",
    ];
    const smokeFactorySlugs = [
      "dongguan-oppo-mobile",
      "dongguan-vivo-mobile",
      "dongguan-amperex-technology",
      "dongguan-delta-electronics",
      "dongguan-luxshare-precision",
      "nantong-violet-home-textile",
      "nantong-luolai-lifestyle",
      "nantong-xinyi-home-textile",
      "nantong-jinkanghong-textile",
      "nantong-nanshing-home-textile",
    ];

    for (const slug of smokeClusterSlugs) {
      const cluster = data.clusters.find(
        (candidate) => candidate.slug === slug,
      );
      expect(cluster?.boundary?.type).toBe("MultiPolygon");
      expect(cluster?.boundary?.coordinates.length).toBeGreaterThan(0);
    }

    expect(
      data.factories
        .filter(({ clusterSlug }) =>
          smokeClusterSlugs.includes(clusterSlug ?? ""),
        )
        .map(({ slug }) => slug)
        .sort(),
    ).toEqual([...smokeFactorySlugs].sort());
    const factorySlugs = data.factories.map(({ slug }) => slug);
    for (const replacedSlug of [
      "nantong-goldsun-textile",
      "nantong-sunshine-textile",
      "nantong-bestwin-textile",
    ]) {
      expect(factorySlugs).not.toContain(replacedSlug);
    }
  });
});

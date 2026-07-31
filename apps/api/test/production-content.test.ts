import { describe, expect, it } from "vitest";

import { productionContentInternals } from "../src/production-content/production-content.js";

describe("M5-T8a production content safety", () => {
  it("removes exactly the staging prefix from production media keys", () => {
    expect(
      productionContentInternals.productionObjectKey(
        "staging/factories/abc/image.png",
      ),
    ).toBe("factories/abc/image.png");
    expect(() =>
      productionContentInternals.productionObjectKey(
        "dev/factories/abc/image.png",
      ),
    ).toThrow(/must start with staging/u);
  });

  it("rejects synthetic and test identifiers", () => {
    expect(() =>
      productionContentInternals.assertNoSyntheticIdentifiers([
        "dongguan-electronics",
        "synthetic-m1t8-1",
      ]),
    ).toThrow(/Synthetic\/test/u);
    expect(() =>
      productionContentInternals.assertNoSyntheticIdentifiers([
        "dongguan-electronics",
        "factories/real/image.png",
      ]),
    ).not.toThrow();
  });

  it("requires the query result to equal the curated allowlist", () => {
    expect(() =>
      productionContentInternals.assertExactSelection(
        ["cluster-b", "cluster-a"],
        ["cluster-a", "cluster-b"],
        "Cluster",
      ),
    ).not.toThrow();
    expect(() =>
      productionContentInternals.assertExactSelection(
        ["cluster-a"],
        ["cluster-a", "cluster-b"],
        "Cluster",
      ),
    ).toThrow(/selection mismatch/u);
  });
});

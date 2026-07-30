import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertRealSeedEnvironment,
  findChangedCategorySearchIds,
  runRealSeed,
} from "../src/seeds/seed-real.js";
import type { CategorySeedRow } from "../src/seeds/real-seed-data.js";

function category(overrides: Partial<CategorySeedRow> = {}): CategorySeedRow {
  return {
    aliases: { en: ["lamps"], zh: ["灯具"] },
    color: "#112233",
    icon: "lightbulb",
    id: "category0000000000000",
    name: { en: "Lighting", zh: "照明" },
    parentSlug: null,
    slug: "lighting",
    sortOrder: 10,
    ...overrides,
  };
}

describe("M1-T8 real seed environment guard", () => {
  it("rejects production before reading data or parsing provider variables", async () => {
    await expect(
      runRealSeed({
        environment: { APP_ENV: "production" },
        argumentsList: [],
        seedDirectory: resolve(import.meta.dirname, "does-not-exist"),
      }),
    ).rejects.toThrow("Real seed is forbidden in production");
  });

  it("requires the exact staging confirmation", () => {
    expect(() => assertRealSeedEnvironment("staging", [])).toThrow(
      "Staging seed requires the exact --confirm-staging argument",
    );
    expect(() =>
      assertRealSeedEnvironment("staging", [
        "--confirm-staging",
        "--unexpected",
      ]),
    ).toThrow("Staging seed requires the exact --confirm-staging argument");
    expect(() =>
      assertRealSeedEnvironment("staging", ["--confirm-staging"]),
    ).not.toThrow();
  });

  it("allows local without arguments and rejects all other combinations", () => {
    expect(() => assertRealSeedEnvironment("local", [])).not.toThrow();
    expect(() =>
      assertRealSeedEnvironment("local", ["--confirm-staging"]),
    ).toThrow("Local seed does not accept confirmation arguments");
    expect(() => assertRealSeedEnvironment(undefined, [])).toThrow(
      "Real seed requires APP_ENV=local or APP_ENV=staging",
    );
  });

  it("detects only actual name or aliases changes for existing categories", () => {
    const source = category();
    const existing = {
      aliases: source.aliases,
      id: source.id,
      name: source.name,
      slug: source.slug,
    };

    expect(
      findChangedCategorySearchIds(
        [existing],
        [category({ icon: "different-icon", sortOrder: 99 })],
      ),
    ).toEqual([]);
    expect(
      findChangedCategorySearchIds(
        [existing],
        [category({ name: { en: "Luminaires", zh: "灯饰" } })],
      ),
    ).toEqual([source.id]);
    expect(
      findChangedCategorySearchIds(
        [existing],
        [category({ aliases: { en: ["lights"], zh: ["灯饰"] } })],
      ),
    ).toEqual([source.id]);
    expect(findChangedCategorySearchIds([], [source])).toEqual([]);
  });
});

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertRealSeedEnvironment,
  runRealSeed,
} from "../src/seeds/seed-real.js";

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
});

import { describe, expect, it } from "vitest";

import {
  clusterStatsSchema,
  coordinateSchema,
  factoryContactSchema,
  factoryImagesSchema,
  localizedAliasesSchema,
  localizedTextSchema,
} from "./core-data.js";

describe("core JSON schemas", () => {
  it("accepts the frozen localized and factory JSON shapes", () => {
    expect(localizedTextSchema.parse({ en: "Lighting", zh: "照明" })).toEqual({
      en: "Lighting",
      zh: "照明",
    });
    expect(
      localizedAliasesSchema.parse({
        en: ["led light"],
        zh: ["LED 灯"],
      }),
    ).toEqual({ en: ["led light"], zh: ["LED 灯"] });
    expect(coordinateSchema.parse({ lng: 120.1, lat: 30.2 })).toEqual({
      lng: 120.1,
      lat: 30.2,
    });
    expect(
      factoryContactSchema.parse({
        email: "sales@example.com",
        website: "https://example.com",
      }),
    ).toEqual({
      email: "sales@example.com",
      website: "https://example.com",
    });
    expect(
      factoryImagesSchema.parse([
        {
          alt: { en: "Factory exterior", zh: "工厂外观" },
          objectKey: "factories/factory-id/exterior.webp",
        },
      ]),
    ).toHaveLength(1);
  });

  it("keeps cluster stats strict and never persists factoryCount", () => {
    expect(
      clusterStatsSchema.parse({
        annualOutputUsd: 10_000_000,
        exportShare: 0.65,
        note: { en: "Estimate", zh: "估算" },
      }),
    ).toEqual({
      annualOutputUsd: 10_000_000,
      exportShare: 0.65,
      note: { en: "Estimate", zh: "估算" },
    });

    expect(() =>
      clusterStatsSchema.parse({
        annualOutputUsd: 10_000_000,
        factoryCount: 25,
      }),
    ).toThrow();
  });

  it("rejects unknown keys and invalid coordinate order/ranges", () => {
    expect(() =>
      localizedTextSchema.parse({
        en: "Lighting",
        extra: "not allowed",
        zh: "照明",
      }),
    ).toThrow();
    expect(() => coordinateSchema.parse({ lng: 31, lat: 121 })).toThrow();
  });
});

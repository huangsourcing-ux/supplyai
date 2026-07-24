import { describe, expect, it } from "vitest";

import { buildSearchText } from "./search-text.js";

const lighting = {
  aliases: {
    en: [" led light ", "led   strip"],
    zh: ["LED 灯", "灯带"],
  },
  name: { en: "Lighting", zh: "照明" },
} as const;

describe("buildSearchText", () => {
  it("builds category text from same-language name and aliases", () => {
    expect(
      buildSearchText({
        ...lighting,
        kind: "category",
      }),
    ).toEqual({
      searchTextEn: "Lighting led light led strip",
      searchTextZh: "照明 LED 灯 灯带",
    });
  });

  it("builds cluster text from products, summary, and category data", () => {
    expect(
      buildSearchText({
        categories: [lighting],
        kind: "cluster",
        mainProducts: [
          { en: "LED bulbs", zh: "LED 灯泡" },
          { en: "  Smart   lamps ", zh: "智能灯具" },
        ],
        name: { en: "Guzhen Lighting Cluster", zh: "古镇灯饰产业带" },
        summary: {
          en: "Decorative lighting manufacturing",
          zh: "装饰照明制造",
        },
      }),
    ).toEqual({
      searchTextEn:
        "Guzhen Lighting Cluster LED bulbs Smart lamps Decorative lighting manufacturing Lighting led light led strip",
      searchTextZh:
        "古镇灯饰产业带 LED 灯泡 智能灯具 装饰照明制造 照明 LED 灯 灯带",
    });
  });

  it("builds factory text without leaking cluster-only summary fields", () => {
    expect(
      buildSearchText({
        categories: [lighting],
        kind: "factory",
        mainProducts: [{ en: "LED drivers", zh: "LED 驱动" }],
        name: { en: "Bright Factory", zh: "光明工厂" },
      }),
    ).toEqual({
      searchTextEn: "Bright Factory LED drivers Lighting led light led strip",
      searchTextZh: "光明工厂 LED 驱动 照明 LED 灯 灯带",
    });
  });
});

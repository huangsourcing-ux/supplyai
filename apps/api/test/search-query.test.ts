import { describe, expect, it } from "vitest";

import {
  classifySearchQuery,
  escapeIlikePattern,
} from "../src/search/search-query.js";

describe("search query classification", () => {
  it.each([
    ["led", "english"],
    ["123", "english"],
    ["家具", "chinese-two-character"],
    ["袜子厂", "chinese"],
    ["LED灯", "mixed"],
    ["家🏭", "chinese"],
  ] as const)("classifies %s as %s", (query, expected) => {
    expect(classifySearchQuery(query)).toBe(expected);
  });

  it("escapes ILIKE wildcard and escape characters", () => {
    expect(escapeIlikePattern(String.raw`家%_具\厂`)).toBe(
      String.raw`家\%\_具\\厂`,
    );
  });
});

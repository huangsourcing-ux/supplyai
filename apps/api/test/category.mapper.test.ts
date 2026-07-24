import { describe, expect, it } from "vitest";

import {
  buildPublicCategoryTree,
  type CategoryRow,
} from "../src/categories/category.mapper.js";

const categories: CategoryRow[] = [
  {
    color: null,
    icon: null,
    id: "zyxwvutsrqponmlkjihgf",
    name: { en: "LED Lighting", zh: "LED 照明" },
    parentId: "abcdefghijklmnopqrstu",
    slug: "led-lighting",
    sortOrder: 2,
  },
  {
    color: "#112233",
    icon: "shirt",
    id: "123456789012345678901",
    name: { en: "Apparel", zh: "服装" },
    parentId: null,
    slug: "apparel",
    sortOrder: 1,
  },
  {
    color: "#445566",
    icon: "bulb",
    id: "abcdefghijklmnopqrstu",
    name: { en: "Lighting", zh: "照明" },
    parentId: null,
    slug: "lighting",
    sortOrder: 1,
  },
  {
    color: null,
    icon: null,
    id: "uvwxyzabcdefghijklmno",
    name: { en: "Bulbs", zh: "灯泡" },
    parentId: "abcdefghijklmnopqrstu",
    slug: "bulbs",
    sortOrder: 2,
  },
];

describe("public category mapping", () => {
  it("builds a stable two-level English tree and keeps empty roots", () => {
    const tree = buildPublicCategoryTree(categories);

    expect(tree.map((root) => root.id)).toEqual([
      "123456789012345678901",
      "abcdefghijklmnopqrstu",
    ]);
    expect(tree[1]?.children.map((child) => child.id)).toEqual([
      "uvwxyzabcdefghijklmno",
      "zyxwvutsrqponmlkjihgf",
    ]);
    expect(tree[0]?.name).toBe("Apparel");
    expect(tree[0]?.children).toEqual([]);
    expect(tree[1]?.children).toHaveLength(2);
    expect(JSON.stringify(tree)).not.toContain("照明");
  });
});

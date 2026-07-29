import { resolveCategoryIconName } from "./category-icon";

describe("Explore category icons", () => {
  it.each([
    ["cpu", "microchip"],
    ["lightbulb", "lightbulb"],
    ["armchair", "couch"],
    ["blocks", "cubes-stacked"],
    ["package", "box"],
    ["wrench", "wrench"],
    ["bed", "bed"],
    ["footprints", "shoe-prints"],
    ["cup-saucer", "mug-saucer"],
  ])("maps %s to the locked Font Awesome 6 glyph %s", (input, expected) => {
    expect(resolveCategoryIconName(input)).toBe(expected);
  });

  it("uses a generic shapes glyph for missing or unknown data", () => {
    expect(resolveCategoryIconName(null)).toBe("shapes");
    expect(resolveCategoryIconName("future-category-icon")).toBe("shapes");
  });
});

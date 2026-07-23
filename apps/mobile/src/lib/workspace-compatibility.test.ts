import { localizedTextSchema } from "@chinasupply/schemas";

import { workspaceCompatibility } from "./workspace-compatibility";

describe("workspace package compatibility", () => {
  it("loads runtime exports from schemas, geo, and i18n", () => {
    expect(workspaceCompatibility.ready).toBe(true);
    expect(workspaceCompatibility.coordinateOrder).toEqual([
      "longitude",
      "latitude",
    ]);
    expect(
      localizedTextSchema.parse(workspaceCompatibility.localizedBrand),
    ).toEqual({ en: "ChinaSupply.AI", zh: "ChinaSupply.AI" });
  });
});

import { describe, expect, it } from "vitest";

import { buildImportObjectKeys } from "../src/imports/import-object-keys.js";

describe("import object keys", () => {
  it("isolates environment, entity, job and format", () => {
    expect(
      buildImportObjectKeys({
        prefix: "staging",
        entity: "factories",
        importId: "import000000000000000",
        sourceFormat: "csv",
      }),
    ).toEqual({
      sourceObjectKey:
        "staging/imports/factories/import000000000000000/source.csv",
      reportObjectKey:
        "staging/imports/factories/import000000000000000/report.json",
    });
  });

  it("does not add an empty production prefix", () => {
    expect(
      buildImportObjectKeys({
        prefix: "",
        entity: "clusters",
        importId: "import000000000000000",
        sourceFormat: "json",
      }).sourceObjectKey,
    ).toBe("imports/clusters/import000000000000000/source.json");
  });
});

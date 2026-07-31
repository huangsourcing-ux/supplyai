import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CLUSTER_IMPORT_CSV_HEADERS,
  FACTORY_GEOCODE_CSV_HEADERS,
  FACTORY_IMPORT_CSV_HEADERS,
  clusterImportRowSchema,
  factoryGeocodeRowSchema,
  factoryImportRowSchema,
} from "@chinasupply/schemas";

import {
  parseFactoryGeocodeFile,
  parseImportFile,
} from "../src/imports/import-file-parser.js";

const regionId = "region000000000000000";
const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function csvCell(value: unknown): string {
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

describe("import file parser", () => {
  it("normalizes cluster CSV into the canonical row contract", () => {
    const values = [
      "lighting-cluster",
      "Lighting Cluster",
      "照明产业带",
      regionId,
      "lighting",
      ["lighting", "led"],
      "113.2",
      "23.1",
      "",
      "Lighting makers",
      "照明制造商",
      "",
      "",
      [{ en: "LED lights", zh: "LED 灯" }],
      "",
      "",
    ];
    const source = `${CLUSTER_IMPORT_CSV_HEADERS.join(",")}\n${values
      .map(csvCell)
      .join(",")}\n`;
    const [candidate] = parseImportFile("clusters", "csv", source);

    expect(candidate?.row).toBe(2);
    expect(candidate?.issues).toEqual([]);
    expect(clusterImportRowSchema.parse(candidate?.value)).toMatchObject({
      slug: "lighting-cluster",
      categorySlugs: ["lighting", "led"],
      boundary: null,
    });
  });

  it("normalizes factory CSV and reports malformed JSON at field level", () => {
    const values = [
      "bright-factory",
      "Bright Factory",
      "光明工厂",
      "lighting-cluster",
      regionId,
      "Shenzhen",
      "深圳",
      "114.1",
      "22.5",
      ["lighting"],
      [{ en: "LED lights", zh: "LED 灯" }],
      ["ISO9001"],
      "100 pieces",
      "2012",
      "100-500",
      "{bad-json",
      [],
      "Directory",
      "https://example.com/source",
    ];
    const source = `${FACTORY_IMPORT_CSV_HEADERS.join(",")}\n${values
      .map(csvCell)
      .join(",")}\n`;
    const [candidate] = parseImportFile("factories", "csv", source);

    expect(candidate?.issues).toEqual([
      {
        path: ["contact"],
        code: "invalid_format",
        message: "contact must contain valid JSON",
      },
    ]);
    expect(factoryImportRowSchema.parse(candidate?.value).contact).toBeNull();
  });

  it("normalizes a coordinate-less factory geocoding CSV", () => {
    const values = [
      "geocoded-factory",
      "Geocoded Factory",
      "地理编码工厂",
      "",
      regionId,
      "6 Futong East Street, Beijing, China",
      "北京市朝阳区阜通东大街6号",
      ["lighting"],
      [{ en: "Components", zh: "零部件" }],
      [],
      "",
      "",
      "",
      "",
      [],
      "Directory",
      "https://example.com/source",
    ];
    const source = `${FACTORY_GEOCODE_CSV_HEADERS.join(",")}\n${values
      .map(csvCell)
      .join(",")}\n`;
    const [candidate] = parseFactoryGeocodeFile("csv", source);
    const row = factoryGeocodeRowSchema.parse(candidate?.value);

    expect(candidate?.row).toBe(2);
    expect(candidate?.issues).toEqual([]);
    expect(row).not.toHaveProperty("location");
    expect(row.address.zh).toBe("北京市朝阳区阜通东大街6号");
  });

  it("requires exact headers and a versioned JSON envelope", () => {
    expect(() =>
      parseImportFile("clusters", "csv", "slug,name\nx,y\n"),
    ).toThrow(/CSV headers must exactly match/);
    expect(() =>
      parseImportFile(
        "factories",
        "json",
        JSON.stringify({ version: 2, rows: [] }),
      ),
    ).toThrow();
    expect(
      parseImportFile(
        "factories",
        "json",
        JSON.stringify({ version: 1, rows: [{ slug: "x" }] }),
      ),
    ).toEqual([{ row: 1, value: { slug: "x" }, issues: [] }]);
    expect(() =>
      parseFactoryGeocodeFile("csv", "slug,addressZh\nx,y\n"),
    ).toThrow(/CSV headers must exactly match/);
    expect(() =>
      parseFactoryGeocodeFile("json", JSON.stringify({ version: 2, rows: [] })),
    ).toThrow();
  });

  it("keeps every committed import and geocoding template parseable", () => {
    for (const [entity, format, schema] of [
      ["clusters", "csv", clusterImportRowSchema],
      ["clusters", "json", clusterImportRowSchema],
      ["factories", "csv", factoryImportRowSchema],
      ["factories", "json", factoryImportRowSchema],
    ] as const) {
      const source = readFileSync(
        resolve(workspaceRoot, `docs/import-templates/${entity}.${format}`),
        "utf8",
      );
      const candidates = parseImportFile(entity, format, source);
      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.issues).toEqual([]);
      expect(schema.safeParse(candidates[0]?.value).success).toBe(true);
    }

    for (const format of ["csv", "json"] as const) {
      const source = readFileSync(
        resolve(
          workspaceRoot,
          `docs/import-templates/factories-geocode.${format}`,
        ),
        "utf8",
      );
      const candidates = parseFactoryGeocodeFile(format, source);
      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.issues).toEqual([]);
      expect(
        factoryGeocodeRowSchema.safeParse(candidates[0]?.value).success,
      ).toBe(true);
    }
  });
});

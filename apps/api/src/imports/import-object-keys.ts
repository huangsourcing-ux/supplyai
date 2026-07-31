import type { ImportEntity, ImportSourceFormat } from "@chinasupply/schemas";

function withPrefix(prefix: string, key: string): string {
  return prefix.length === 0 ? key : `${prefix}/${key}`;
}

export function buildImportObjectKeys(input: {
  prefix: string;
  entity: ImportEntity;
  importId: string;
  sourceFormat: ImportSourceFormat;
}): { sourceObjectKey: string; reportObjectKey: string } {
  const base = `imports/${input.entity}/${input.importId}`;
  return {
    sourceObjectKey: withPrefix(
      input.prefix,
      `${base}/source.${input.sourceFormat}`,
    ),
    reportObjectKey: withPrefix(input.prefix, `${base}/report.json`),
  };
}

export function buildGeocodeFactoriesObjectKeys(input: {
  prefix: string;
  geocodeId: string;
  sourceFormat: ImportSourceFormat;
}): { sourceObjectKey: string; reportObjectKey: string } {
  const base = `imports/geocode-factories/${input.geocodeId}`;
  return {
    sourceObjectKey: withPrefix(
      input.prefix,
      `${base}/source.${input.sourceFormat}`,
    ),
    reportObjectKey: withPrefix(input.prefix, `${base}/report.json`),
  };
}

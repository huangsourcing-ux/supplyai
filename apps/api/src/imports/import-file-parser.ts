import {
  CLUSTER_IMPORT_CSV_HEADERS,
  FACTORY_IMPORT_CSV_HEADERS,
  clusterImportJsonDocumentSchema,
  factoryImportJsonDocumentSchema,
  type ImportEntity,
  type ImportReportIssue,
  type ImportSourceFormat,
} from "@chinasupply/schemas";
import { parse } from "csv-parse/sync";

export interface ParsedImportCandidate {
  row: number;
  value: unknown;
  issues: ImportReportIssue[];
}

function issue(path: string, message: string): ImportReportIssue {
  return { path: [path], code: "invalid_format", message };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function numberValue(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? Number.NaN : Number(trimmed);
}

function jsonValue(
  value: string,
  path: string,
  emptyValue: unknown,
  issues: ImportReportIssue[],
): unknown {
  if (value.trim().length === 0) {
    return emptyValue;
  }

  try {
    return JSON.parse(value);
  } catch {
    issues.push(issue(path, `${path} must contain valid JSON`));
    return undefined;
  }
}

function localizedOrNull(en: string, zh: string) {
  return en.trim().length === 0 && zh.trim().length === 0 ? null : { en, zh };
}

function normalizeClusterCsvRow(
  values: string[],
  row: number,
): ParsedImportCandidate {
  const issues: ImportReportIssue[] = [];
  const [
    slug = "",
    nameEn = "",
    nameZh = "",
    regionId = "",
    primaryCategorySlug = "",
    categorySlugs = "",
    centroidLng = "",
    centroidLat = "",
    boundary = "",
    summaryEn = "",
    summaryZh = "",
    descriptionEn = "",
    descriptionZh = "",
    mainProducts = "",
    coverImage = "",
    stats = "",
  ] = values;

  return {
    row,
    issues,
    value: {
      slug,
      name: { en: nameEn, zh: nameZh },
      regionId,
      primaryCategorySlug,
      categorySlugs: jsonValue(categorySlugs, "categorySlugs", [], issues),
      centroid: [numberValue(centroidLng), numberValue(centroidLat)],
      boundary: jsonValue(boundary, "boundary", null, issues),
      summary: { en: summaryEn, zh: summaryZh },
      description: localizedOrNull(descriptionEn, descriptionZh),
      mainProducts: jsonValue(mainProducts, "mainProducts", [], issues),
      coverImage: optional(coverImage),
      stats: jsonValue(stats, "stats", null, issues),
    },
  };
}

function normalizeFactoryCsvRow(
  values: string[],
  row: number,
): ParsedImportCandidate {
  const issues: ImportReportIssue[] = [];
  const [
    slug = "",
    nameEn = "",
    nameZh = "",
    clusterSlug = "",
    regionId = "",
    addressEn = "",
    addressZh = "",
    locationLng = "",
    locationLat = "",
    categorySlugs = "",
    mainProducts = "",
    certifications = "",
    moq = "",
    establishedYear = "",
    employeeRange = "",
    contact = "",
    images = "",
    sourceName = "",
    sourceUrl = "",
  ] = values;

  return {
    row,
    issues,
    value: {
      slug,
      name: { en: nameEn, zh: nameZh },
      clusterSlug: optional(clusterSlug),
      regionId,
      address: { en: addressEn, zh: addressZh },
      location: [numberValue(locationLng), numberValue(locationLat)],
      categorySlugs: jsonValue(categorySlugs, "categorySlugs", [], issues),
      mainProducts: jsonValue(mainProducts, "mainProducts", [], issues),
      certifications: jsonValue(certifications, "certifications", [], issues),
      moq: optional(moq),
      establishedYear:
        establishedYear.trim().length === 0
          ? null
          : numberValue(establishedYear),
      employeeRange: optional(employeeRange),
      contact: jsonValue(contact, "contact", null, issues),
      images: jsonValue(images, "images", [], issues),
      sourceName: optional(sourceName),
      sourceUrl: optional(sourceUrl),
    },
  };
}

function parseCsv(
  entity: ImportEntity,
  source: string,
): ParsedImportCandidate[] {
  const rows = parse(source, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  const expected =
    entity === "clusters"
      ? CLUSTER_IMPORT_CSV_HEADERS
      : FACTORY_IMPORT_CSV_HEADERS;
  const headers = rows.shift();

  if (
    headers === undefined ||
    headers.length !== expected.length ||
    headers.some((header, index) => header !== expected[index])
  ) {
    throw new Error(`CSV headers must exactly match: ${expected.join(",")}`);
  }

  return rows.map((values, index) =>
    entity === "clusters"
      ? normalizeClusterCsvRow(values, index + 2)
      : normalizeFactoryCsvRow(values, index + 2),
  );
}

function parseJson(
  entity: ImportEntity,
  source: string,
): ParsedImportCandidate[] {
  const raw: unknown = JSON.parse(source);
  const document =
    entity === "clusters"
      ? clusterImportJsonDocumentSchema.parse(raw)
      : factoryImportJsonDocumentSchema.parse(raw);

  return document.rows.map((value, index) => ({
    row: index + 1,
    value,
    issues: [],
  }));
}

export function parseImportFile(
  entity: ImportEntity,
  format: ImportSourceFormat,
  source: string,
): ParsedImportCandidate[] {
  return format === "csv"
    ? parseCsv(entity, source)
    : parseJson(entity, source);
}

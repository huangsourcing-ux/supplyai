import type { LocalizedText } from "./core-data.js";

type SearchAliases = Readonly<{
  en?: readonly string[];
  zh?: readonly string[];
}>;
type SearchCategory = Readonly<{
  aliases: SearchAliases;
  name: LocalizedText;
}>;

type CategorySearchTextSource = Readonly<{
  aliases: SearchAliases;
  kind: "category";
  name: LocalizedText;
}>;

type ClusterSearchTextSource = Readonly<{
  categories: readonly SearchCategory[];
  kind: "cluster";
  mainProducts: readonly LocalizedText[];
  name: LocalizedText;
  summary: LocalizedText;
}>;

type FactorySearchTextSource = Readonly<{
  categories: readonly SearchCategory[];
  kind: "factory";
  mainProducts: readonly LocalizedText[];
  name: LocalizedText;
}>;

export type SearchTextSource =
  CategorySearchTextSource | ClusterSearchTextSource | FactorySearchTextSource;

export type SearchText = Readonly<{
  searchTextEn: string;
  searchTextZh: string;
}>;

type Locale = keyof LocalizedText;

function normalizePart(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function appendLocalizedText(
  parts: string[],
  value: LocalizedText,
  locale: Locale,
): void {
  parts.push(value[locale]);
}

function appendAliases(
  parts: string[],
  aliases: SearchAliases,
  locale: Locale,
): void {
  parts.push(...(aliases[locale] ?? []));
}

function buildForLocale(source: SearchTextSource, locale: Locale): string {
  const parts: string[] = [];
  appendLocalizedText(parts, source.name, locale);

  if (source.kind === "category") {
    appendAliases(parts, source.aliases, locale);
  } else {
    for (const product of source.mainProducts) {
      appendLocalizedText(parts, product, locale);
    }

    if (source.kind === "cluster") {
      appendLocalizedText(parts, source.summary, locale);
    }

    for (const category of source.categories) {
      appendLocalizedText(parts, category.name, locale);
      appendAliases(parts, category.aliases, locale);
    }
  }

  return parts.map(normalizePart).filter(Boolean).join(" ");
}

/**
 * The only supported generator for the denormalized search_text columns.
 * Create, update, import, and regeneration paths must all call this function.
 */
export function buildSearchText(source: SearchTextSource): SearchText {
  return {
    searchTextEn: buildForLocale(source, "en"),
    searchTextZh: buildForLocale(source, "zh"),
  };
}

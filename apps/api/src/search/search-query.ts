import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

const hanCharacterPattern = /\p{Script=Han}/u;
const latinCharacterPattern = /\p{Script=Latin}/u;

export type SearchQueryMode =
  "chinese" | "chinese-two-character" | "english" | "mixed";

export interface SearchRanking {
  readonly match: SQL<boolean>;
  readonly orderBy: readonly SQL[];
}

export function classifySearchQuery(query: string): SearchQueryMode {
  const hasHan = hanCharacterPattern.test(query);
  const hasLatin = latinCharacterPattern.test(query);

  if (hasHan && hasLatin) {
    return "mixed";
  }

  if (hasHan) {
    const characters = Array.from(query);
    return characters.length === 2 &&
      characters.every((character) => hanCharacterPattern.test(character))
      ? "chinese-two-character"
      : "chinese";
  }

  return "english";
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/gu, "\\$&");
}

export function buildSearchRanking(
  query: string,
  searchTextEn: SQLWrapper,
  searchTextZh: SQLWrapper,
): SearchRanking {
  const mode = classifySearchQuery(query);

  if (mode === "chinese-two-character") {
    const escapedQuery = escapeIlikePattern(query);
    const prefixMatch = sql<boolean>`${searchTextZh} ilike ${`${escapedQuery}%`} escape '\'`;
    const containsMatch = sql<boolean>`${searchTextZh} ilike ${`%${escapedQuery}%`} escape '\'`;

    return {
      match: sql<boolean>`(${prefixMatch} or ${containsMatch})`,
      orderBy: [sql`${prefixMatch} desc`],
    };
  }

  const englishVector = sql`to_tsvector('english', ${searchTextEn})`;
  const englishQuery = sql`plainto_tsquery('english', ${query})`;
  const englishFtsMatch = sql<boolean>`${englishVector} @@ ${englishQuery}`;
  const englishTrigramMatch = sql<boolean>`${query} <% ${searchTextEn}`;
  const englishTrigramRank = sql<number>`word_similarity(${query}, ${searchTextEn})`;
  const chineseTrigramMatch = sql<boolean>`${query} <% ${searchTextZh}`;
  const chineseTrigramRank = sql<number>`word_similarity(${query}, ${searchTextZh})`;

  if (mode === "chinese") {
    return {
      match: chineseTrigramMatch,
      orderBy: [sql`${chineseTrigramRank} desc`],
    };
  }

  const trigramMatch =
    mode === "mixed"
      ? sql<boolean>`(${englishTrigramMatch} or ${chineseTrigramMatch})`
      : englishTrigramMatch;
  const trigramRank =
    mode === "mixed"
      ? sql<number>`greatest(${englishTrigramRank}, ${chineseTrigramRank})`
      : englishTrigramRank;
  const combinedRank = sql<number>`
    case
      when ${englishFtsMatch}
        then ts_rank_cd(${englishVector}, ${englishQuery})
      else ${trigramRank}
    end
  `;

  return {
    match: sql<boolean>`(${englishFtsMatch} or ${trigramMatch})`,
    orderBy: [sql`${englishFtsMatch} desc`, sql`${combinedRank} desc`],
  };
}

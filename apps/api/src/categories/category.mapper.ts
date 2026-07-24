import {
  type LocalizedText,
  publicCategorySummarySchema,
  publicCategoryTreeSchema,
} from "@chinasupply/schemas";
import type { z } from "zod";

export interface CategoryRow {
  color: string | null;
  icon: string | null;
  id: string;
  name: LocalizedText;
  parentId: string | null;
  slug: string;
  sortOrder: number;
}

export type PublicCategorySummary = z.output<
  typeof publicCategorySummarySchema
>;
export type PublicCategoryTree = z.output<typeof publicCategoryTreeSchema>;

export function compareCategoryRows(
  left: CategoryRow,
  right: CategoryRow,
): number {
  return left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
}

export function toPublicCategorySummary(
  row: CategoryRow,
): PublicCategorySummary {
  return publicCategorySummarySchema.parse({
    color: row.color,
    icon: row.icon,
    id: row.id,
    name: row.name.en,
    parentId: row.parentId,
    slug: row.slug,
    sortOrder: row.sortOrder,
  });
}

export function buildPublicCategoryTree(
  rows: readonly CategoryRow[],
): PublicCategoryTree[] {
  const sortedRows = [...rows].sort(compareCategoryRows);
  const childrenByParent = new Map<string, PublicCategorySummary[]>();

  for (const row of sortedRows) {
    if (row.parentId === null) {
      continue;
    }

    const children = childrenByParent.get(row.parentId) ?? [];
    children.push(toPublicCategorySummary(row));
    childrenByParent.set(row.parentId, children);
  }

  return sortedRows
    .filter((row) => row.parentId === null)
    .map((row) =>
      publicCategoryTreeSchema.parse({
        ...toPublicCategorySummary(row),
        children: childrenByParent.get(row.id) ?? [],
      }),
    );
}

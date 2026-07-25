import type {
  GetCategories200DataItem,
  Search200Data,
  Search200DataCategoriesItem,
  Search200DataClustersItem,
  Search200DataFactoriesItem,
} from "@chinasupply/api-client";

import type { SelectedMapFeature } from "./map-selection";

export const SEARCH_DEBOUNCE_MS = 300;
export const POPULAR_CATEGORY_LIMIT = 5;
export const CLUSTER_SEARCH_ZOOM = 9;
export const FACTORY_SEARCH_ZOOM = 13;

export type MapSearchChoice =
  | Search200DataCategoriesItem
  | Search200DataClustersItem
  | Search200DataFactoriesItem;

export type MapSearchAction =
  | {
      category: {
        name: string;
        slug: string;
      };
      kind: "category";
    }
  | {
      center: [number, number];
      kind: "selection";
      selection: SelectedMapFeature;
      zoom: number;
    };

export interface DebouncedSearchUpdater {
  cancel(): void;
  schedule(value: string): void;
}

export function createMapCategoryParams(
  categorySlug: string | undefined,
): { category: string } | undefined {
  return categorySlug === undefined ? undefined : { category: categorySlug };
}

export function addMapCategoryParam<T extends object>(
  params: T,
  categorySlug: string | undefined,
): T | (T & { category: string }) {
  return categorySlug === undefined
    ? params
    : { ...params, category: categorySlug };
}

export function createDebouncedSearchUpdater(
  onUpdate: (value: string) => void,
): DebouncedSearchUpdater {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    cancel() {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
    },
    schedule(value) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onUpdate(value);
      }, SEARCH_DEBOUNCE_MS);
    },
  };
}

export function getSearchResultCount(results: Search200Data): number {
  return (
    results.categories.length +
    results.clusters.length +
    results.factories.length
  );
}

export function flattenSearchResults(
  results: Search200Data,
): MapSearchChoice[] {
  return [...results.categories, ...results.clusters, ...results.factories];
}

export function getPopularCategoryChoices(
  categories: readonly GetCategories200DataItem[],
): Search200DataCategoriesItem[] {
  return categories
    .slice(0, POPULAR_CATEGORY_LIMIT)
    .map(({ color, id, name, slug }) => ({
      color,
      id,
      name,
      slug,
      type: "category",
    }));
}

export function getNextSearchOptionIndex(
  activeIndex: number,
  optionCount: number,
  direction: "next" | "previous",
): number {
  if (optionCount === 0) return -1;

  if (direction === "next") {
    return activeIndex < optionCount - 1 ? activeIndex + 1 : 0;
  }

  return activeIndex > 0 ? activeIndex - 1 : optionCount - 1;
}

export function resolveMapSearchAction(
  choice: MapSearchChoice,
): MapSearchAction {
  if (choice.type === "category") {
    return {
      category: {
        name: choice.name,
        slug: choice.slug,
      },
      kind: "category",
    };
  }

  if (choice.type === "cluster") {
    return {
      center: choice.centroid.coordinates,
      kind: "selection",
      selection: {
        factoryCount: choice.factoryCount,
        id: choice.id,
        kind: "cluster",
        name: choice.name,
        slug: choice.slug,
      },
      zoom: CLUSTER_SEARCH_ZOOM,
    };
  }

  return {
    center: choice.location.coordinates,
    kind: "selection",
    selection: {
      clusterId: null,
      id: choice.id,
      kind: "factory",
      name: choice.name,
      slug: choice.slug,
      verified: choice.verified,
    },
    zoom: FACTORY_SEARCH_ZOOM,
  };
}

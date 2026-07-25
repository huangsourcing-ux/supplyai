import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GetCategories200DataItem,
  Search200Data,
} from "@chinasupply/api-client";

import {
  addMapCategoryParam,
  CATEGORY_FILTER_DEBOUNCE_MS,
  CLUSTER_SEARCH_ZOOM,
  createDebouncedCategoryFilterUpdater,
  createDebouncedSearchUpdater,
  createMapCategoryParams,
  FACTORY_SEARCH_ZOOM,
  flattenSearchResults,
  getNextSearchOptionIndex,
  getPopularCategoryChoices,
  getSearchResultCount,
  resolveCategoryChipSelection,
  resolveMapSearchAction,
  SEARCH_DEBOUNCE_MS,
} from "../app/(frontend)/map/map-search-model";
import {
  MapCategoryChips,
  type MapCategoryChipsLabels,
} from "../app/(frontend)/map/map-category-chips";
import {
  MapSearchResults,
  type MapSearchResultLabels,
} from "../app/(frontend)/map/map-search-results";

const searchResults: Search200Data = {
  categories: [
    {
      color: "#0F766E",
      id: "cat000000000000000001",
      name: "Furniture",
      slug: "furniture",
      type: "category",
    },
  ],
  clusters: [
    {
      centroid: {
        coordinates: [120.075, 29.306],
        type: "Point",
      },
      factoryCount: 12,
      id: "clu000000000000000001",
      name: "Yiwu Small Commodities",
      slug: "yiwu-small-commodities",
      type: "cluster",
    },
  ],
  factories: [
    {
      id: "fac000000000000000001",
      location: {
        coordinates: [120.08, 29.31],
        type: "Point",
      },
      name: "Yiwu Bright Goods Factory",
      slug: "yiwu-bright-goods",
      type: "factory",
      verified: true,
    },
  ],
};

const rootCategories: GetCategories200DataItem[] = [
  {
    children: [
      {
        color: null,
        icon: "sofa",
        id: "chi000000000000000001",
        name: "Home Furniture",
        parentId: "cat000000000000000001",
        slug: "home-furniture",
        sortOrder: 11,
      },
    ],
    color: "#2563EB",
    icon: "cpu",
    id: "cat000000000000000001",
    name: "Electronics",
    parentId: null,
    slug: "electronics",
    sortOrder: 10,
  },
  {
    children: [],
    color: "#92400E",
    icon: "armchair",
    id: "cat000000000000000002",
    name: "Furniture",
    parentId: null,
    slug: "furniture",
    sortOrder: 20,
  },
];

function labels(): MapSearchResultLabels {
  return {
    categories: "Categories",
    categoryResult: "Category",
    clusters: "Industrial clusters",
    error: "Search could not be completed.",
    factories: "Factories",
    factoryCount: (count) => `${count} factories`,
    loading: "Searching…",
    loadingPopular: "Loading popular categories…",
    noResults: "No matching suppliers found.",
    popularCategories: "Popular categories",
    results: "Search results",
    retry: "Retry",
    unverified: "Unverified factory",
    verified: "Verified factory",
  };
}

function categoryLabels(): MapCategoryChipsLabels {
  return {
    all: "All categories",
    error: "Categories could not be loaded.",
    group: "Filter map by category",
    loading: "Loading categories…",
    removeCategory: (category) => `Remove ${category} filter`,
    retry: "Retry",
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Web map search model", () => {
  it("debounces searches for exactly 300ms and supports cancellation", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    const updater = createDebouncedSearchUpdater(update);

    updater.schedule("le");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    updater.schedule("led");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(update).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith("led");

    updater.schedule("socks");
    updater.cancel();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(update).toHaveBeenCalledOnce();
  });

  it("debounces category filters for exactly 500ms and keeps only the latest choice", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    const updater = createDebouncedCategoryFilterUpdater(update);

    updater.schedule({ name: "Electronics", slug: "electronics" });
    vi.advanceTimersByTime(CATEGORY_FILTER_DEBOUNCE_MS - 1);
    updater.schedule({ name: "Furniture", slug: "furniture" });
    vi.advanceTimersByTime(CATEGORY_FILTER_DEBOUNCE_MS - 1);
    expect(update).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      name: "Furniture",
      slug: "furniture",
    });

    updater.schedule(null);
    updater.cancel();
    vi.advanceTimersByTime(CATEGORY_FILTER_DEBOUNCE_MS);
    expect(update).toHaveBeenCalledOnce();
  });

  it("flattens the three frozen result groups and counts every result", () => {
    expect(getSearchResultCount(searchResults)).toBe(3);
    expect(flattenSearchResults(searchResults).map(({ type }) => type)).toEqual(
      ["category", "cluster", "factory"],
    );
  });

  it("uses the first five root categories returned by A-7", () => {
    const categories: GetCategories200DataItem[] = Array.from(
      { length: 7 },
      (_, index) => ({
        children: [],
        color: "#0F766E",
        icon: null,
        id: `cat${String(index).padStart(18, "0")}`,
        name: `Category ${index}`,
        parentId: null,
        slug: `category-${index}`,
        sortOrder: index,
      }),
    );

    expect(
      getPopularCategoryChoices(categories).map(({ slug }) => slug),
    ).toEqual([
      "category-0",
      "category-1",
      "category-2",
      "category-3",
      "category-4",
    ]);
  });

  it("distinguishes all, root, and exact child category filter states", () => {
    expect(resolveCategoryChipSelection(rootCategories, null)).toEqual({
      kind: "all",
    });
    expect(
      resolveCategoryChipSelection(rootCategories, {
        name: "Furniture",
        slug: "furniture",
      }),
    ).toEqual({
      kind: "root",
      slug: "furniture",
    });
    expect(
      resolveCategoryChipSelection(rootCategories, {
        name: "Home Furniture",
        slug: "home-furniture",
      }),
    ).toEqual({
      kind: "child",
    });
  });

  it("wraps keyboard selection and keeps empty lists inactive", () => {
    expect(getNextSearchOptionIndex(-1, 3, "next")).toBe(0);
    expect(getNextSearchOptionIndex(2, 3, "next")).toBe(0);
    expect(getNextSearchOptionIndex(-1, 3, "previous")).toBe(2);
    expect(getNextSearchOptionIndex(0, 3, "previous")).toBe(2);
    expect(getNextSearchOptionIndex(0, 0, "next")).toBe(-1);
  });

  it("propagates a selected category to each MAP query shape", () => {
    expect(createMapCategoryParams("furniture")).toEqual({
      category: "furniture",
    });
    expect(createMapCategoryParams(undefined)).toBeUndefined();
    expect(
      addMapCategoryParam({ bbox: "119,29,121,31", zoom: 10 }, "furniture"),
    ).toEqual({
      bbox: "119,29,121,31",
      category: "furniture",
      zoom: 10,
    });
  });

  it("maps search choices to category filters and immediate map cards", () => {
    expect(resolveMapSearchAction(searchResults.categories[0]!)).toEqual({
      category: { name: "Furniture", slug: "furniture" },
      kind: "category",
    });
    expect(resolveMapSearchAction(searchResults.clusters[0]!)).toEqual({
      center: [120.075, 29.306],
      kind: "selection",
      selection: {
        factoryCount: 12,
        id: "clu000000000000000001",
        kind: "cluster",
        name: "Yiwu Small Commodities",
        slug: "yiwu-small-commodities",
      },
      zoom: CLUSTER_SEARCH_ZOOM,
    });
    expect(resolveMapSearchAction(searchResults.factories[0]!)).toEqual({
      center: [120.08, 29.31],
      kind: "selection",
      selection: {
        clusterId: null,
        id: "fac000000000000000001",
        kind: "factory",
        name: "Yiwu Bright Goods Factory",
        slug: "yiwu-bright-goods",
        verified: true,
      },
      zoom: FACTORY_SEARCH_ZOOM,
    });
  });
});

describe("Web map category chips", () => {
  it("renders ordered root chips with colors and an accessible all state", () => {
    const markup = renderToStaticMarkup(
      <MapCategoryChips
        activeCategory={null}
        categories={rootCategories}
        error={false}
        labels={categoryLabels()}
        loading={false}
        onChoose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Filter map by category"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup.indexOf("All categories")).toBeLessThan(
      markup.indexOf("Electronics"),
    );
    expect(markup.indexOf("Electronics")).toBeLessThan(
      markup.indexOf("Furniture"),
    );
    expect(markup).toContain("background-color:#2563EB");
    expect(markup).not.toContain("Home Furniture");
  });

  it("highlights a root without a duplicate removable filter", () => {
    const markup = renderToStaticMarkup(
      <MapCategoryChips
        activeCategory={{ name: "Furniture", slug: "furniture" }}
        categories={rootCategories}
        error={false}
        labels={categoryLabels()}
        loading={false}
        onChoose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(markup).toContain(
      '<button aria-pressed="true" class="map-category-chip" type="button"><span aria-hidden="true" class="map-category-chip__color" style="background-color:#92400E"',
    );
    expect(markup).not.toContain("Remove Furniture filter");
  });

  it("preserves an exact child filter as a removable label without selecting a root", () => {
    const markup = renderToStaticMarkup(
      <MapCategoryChips
        activeCategory={{
          name: "Home Furniture",
          slug: "home-furniture",
        }}
        categories={rootCategories}
        error={false}
        labels={categoryLabels()}
        loading={false}
        onChoose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(markup).not.toContain('aria-pressed="true"');
    expect(markup).toContain("Home Furniture");
    expect(markup).toContain('aria-label="Remove Home Furniture filter"');
  });

  it("renders localized category loading and retry states without hiding All", () => {
    const loadingMarkup = renderToStaticMarkup(
      <MapCategoryChips
        activeCategory={null}
        categories={[]}
        error={false}
        labels={categoryLabels()}
        loading
        onChoose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    const errorMarkup = renderToStaticMarkup(
      <MapCategoryChips
        activeCategory={null}
        categories={[]}
        error
        labels={categoryLabels()}
        loading={false}
        onChoose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(loadingMarkup).toContain("All categories");
    expect(loadingMarkup).toContain("Loading categories…");
    expect(loadingMarkup).toContain('role="status"');
    expect(errorMarkup).toContain("Categories could not be loaded.");
    expect(errorMarkup).toContain("Retry");
    expect(errorMarkup).toContain('role="alert"');
  });
});

describe("Web map search results", () => {
  it("renders accessible grouped results and their metadata", () => {
    const markup = renderToStaticMarkup(
      <MapSearchResults
        activeIndex={1}
        choices={flattenSearchResults(searchResults)}
        error={false}
        labels={labels()}
        loading={false}
        loadingPopular={false}
        noResults={false}
        onChoose={vi.fn()}
        onRetry={vi.fn()}
        optionIdPrefix="search"
      />,
    );

    expect(markup).toContain('role="listbox"');
    expect(markup).toContain('aria-label="Search results"');
    expect(markup).toContain("Categories");
    expect(markup).toContain("Industrial clusters");
    expect(markup).toContain("Factories");
    expect(markup).toContain("12 factories");
    expect(markup).toContain("Verified factory");
    expect(markup).toContain('aria-selected="true"');
  });

  it("renders no-result guidance with popular category options", () => {
    const markup = renderToStaticMarkup(
      <MapSearchResults
        activeIndex={-1}
        choices={[searchResults.categories[0]!]}
        error={false}
        labels={labels()}
        loading={false}
        loadingPopular={false}
        noResults
        onChoose={vi.fn()}
        onRetry={vi.fn()}
        optionIdPrefix="popular"
      />,
    );

    expect(markup).toContain("No matching suppliers found.");
    expect(markup).toContain("Popular categories");
    expect(markup).toContain("Furniture");
  });

  it("renders localized loading and retry states", () => {
    const loadingMarkup = renderToStaticMarkup(
      <MapSearchResults
        activeIndex={-1}
        choices={[]}
        error={false}
        labels={labels()}
        loading
        loadingPopular={false}
        noResults={false}
        onChoose={vi.fn()}
        onRetry={vi.fn()}
        optionIdPrefix="loading"
      />,
    );
    const errorMarkup = renderToStaticMarkup(
      <MapSearchResults
        activeIndex={-1}
        choices={[]}
        error
        labels={labels()}
        loading={false}
        loadingPopular={false}
        noResults={false}
        onChoose={vi.fn()}
        onRetry={vi.fn()}
        optionIdPrefix="error"
      />,
    );

    expect(loadingMarkup).toContain('role="status"');
    expect(loadingMarkup).toContain("Searching…");
    expect(errorMarkup).toContain('role="alert"');
    expect(errorMarkup).toContain("Retry");
  });
});

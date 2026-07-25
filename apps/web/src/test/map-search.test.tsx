import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GetCategories200DataItem,
  Search200Data,
} from "@chinasupply/api-client";

import {
  addMapCategoryParam,
  CLUSTER_SEARCH_ZOOM,
  createDebouncedSearchUpdater,
  createMapCategoryParams,
  FACTORY_SEARCH_ZOOM,
  flattenSearchResults,
  getNextSearchOptionIndex,
  getPopularCategoryChoices,
  getSearchResultCount,
  resolveMapSearchAction,
  SEARCH_DEBOUNCE_MS,
} from "../app/(frontend)/map/map-search-model";
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

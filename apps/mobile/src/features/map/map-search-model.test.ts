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
  getPopularCategoryChoices,
  getSearchResultCount,
  resolveCategoryChipSelection,
  resolveMapSearchAction,
  SEARCH_DEBOUNCE_MS,
} from "./map-search-model";

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
      centroid: { coordinates: [120.075, 29.306], type: "Point" },
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
      location: { coordinates: [120.08, 29.31], type: "Point" },
      name: "Yiwu Bright Goods Factory",
      slug: "yiwu-bright-goods",
      type: "factory",
      verified: true,
    },
  ],
};

const rootCategories: GetCategories200DataItem[] = [
  {
    children: [],
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

afterEach(() => {
  jest.useRealTimers();
});

describe("App map search model", () => {
  it("debounces searches for exactly 300ms and supports cancellation", () => {
    jest.useFakeTimers();
    const update = jest.fn();
    const updater = createDebouncedSearchUpdater(update);

    updater.schedule("le");
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    updater.schedule("led");
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(update).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("led");

    updater.schedule("socks");
    updater.cancel();
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("debounces category filters for exactly 500ms", () => {
    jest.useFakeTimers();
    const update = jest.fn();
    const updater = createDebouncedCategoryFilterUpdater(update);

    updater.schedule({ name: "Electronics", slug: "electronics" });
    jest.advanceTimersByTime(CATEGORY_FILTER_DEBOUNCE_MS - 1);
    expect(update).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledWith({
      name: "Electronics",
      slug: "electronics",
    });
  });

  it("flattens and counts all three frozen result groups", () => {
    expect(getSearchResultCount(searchResults)).toBe(3);
    expect(flattenSearchResults(searchResults).map(({ type }) => type)).toEqual(
      ["category", "cluster", "factory"],
    );
  });

  it("uses only the first five ordered root categories as popular choices", () => {
    const categories = Array.from({ length: 7 }, (_, index) => ({
      children: [],
      color: "#0F766E",
      icon: null,
      id: `cat${String(index).padStart(18, "0")}`,
      name: `Category ${index}`,
      parentId: null,
      slug: `category-${index}`,
      sortOrder: index,
    })) satisfies GetCategories200DataItem[];

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

  it("distinguishes all, root, and exact child filter states", () => {
    expect(resolveCategoryChipSelection(rootCategories, null)).toEqual({
      kind: "all",
    });
    expect(
      resolveCategoryChipSelection(rootCategories, {
        name: "Furniture",
        slug: "furniture",
      }),
    ).toEqual({ kind: "root", slug: "furniture" });
    expect(
      resolveCategoryChipSelection(rootCategories, {
        name: "Home Furniture",
        slug: "home-furniture",
      }),
    ).toEqual({ kind: "child" });
  });

  it("adds the exact category slug to every MAP query shape", () => {
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

  it("maps search choices to filters and immediate map selections", () => {
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

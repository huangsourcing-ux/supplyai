import { fireEvent, render, screen } from "@testing-library/react-native";
import type {
  GetCategories200DataItem,
  Search200Data,
} from "@chinasupply/api-client";

import {
  MapCategoryChips,
  type MapCategoryChipsLabels,
} from "./map-category-chips";
import { flattenSearchResults } from "./map-search-model";
import {
  MapSearchResults,
  type MapSearchResultLabels,
} from "./map-search-results";

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

const searchResults: Search200Data = {
  categories: [
    {
      color: "#92400E",
      id: "cat000000000000000002",
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

function resultLabels(): MapSearchResultLabels {
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

describe("App map category chips", () => {
  it("renders ordered root chips, color, and accessible selected state", () => {
    render(
      <MapCategoryChips
        activeCategory={{ name: "Furniture", slug: "furniture" }}
        categories={rootCategories}
        error={false}
        labels={categoryLabels()}
        loading={false}
        onChoose={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText("All categories")).toBeOnTheScreen();
    expect(screen.getByText("Electronics")).toBeOnTheScreen();
    expect(
      screen.getByTestId("map-category-furniture").props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen.getByTestId("map-category-electronics-color", {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({ backgroundColor: "#2563EB" });
  });

  it("preserves a child category as an exact removable filter", () => {
    const onChoose = jest.fn();
    render(
      <MapCategoryChips
        activeCategory={{
          name: "Home Furniture",
          slug: "home-furniture",
        }}
        categories={rootCategories}
        error={false}
        labels={categoryLabels()}
        loading={false}
        onChoose={onChoose}
        onRetry={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText("Remove Home Furniture filter"));
    expect(onChoose).toHaveBeenCalledWith(null);
  });

  it("keeps All available alongside localized loading and retry states", () => {
    const retry = jest.fn();
    const { rerender } = render(
      <MapCategoryChips
        activeCategory={null}
        categories={[]}
        error={false}
        labels={categoryLabels()}
        loading
        onChoose={jest.fn()}
        onRetry={retry}
      />,
    );
    expect(screen.getByText("All categories")).toBeOnTheScreen();
    expect(screen.getByText("Loading categories…")).toBeOnTheScreen();

    rerender(
      <MapCategoryChips
        activeCategory={null}
        categories={[]}
        error
        labels={categoryLabels()}
        loading={false}
        onChoose={jest.fn()}
        onRetry={retry}
      />,
    );
    fireEvent.press(screen.getByText("Retry"));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("App map search results", () => {
  it("renders all three groups with result metadata", () => {
    render(
      <MapSearchResults
        choices={flattenSearchResults(searchResults)}
        error={false}
        labels={resultLabels()}
        loading={false}
        loadingPopular={false}
        noResults={false}
        onChoose={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText("Categories")).toBeOnTheScreen();
    expect(screen.getByText("Industrial clusters")).toBeOnTheScreen();
    expect(screen.getByText("Factories")).toBeOnTheScreen();
    expect(screen.getByText("12 factories")).toBeOnTheScreen();
    expect(screen.getByText("Verified factory")).toBeOnTheScreen();
  });

  it("renders no-result guidance and popular category choices", () => {
    const choose = jest.fn();
    render(
      <MapSearchResults
        choices={[searchResults.categories[0]!]}
        error={false}
        labels={resultLabels()}
        loading={false}
        loadingPopular={false}
        noResults
        onChoose={choose}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText("No matching suppliers found.")).toBeOnTheScreen();
    expect(screen.getByText("Popular categories")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Furniture"));
    expect(choose).toHaveBeenCalledWith(searchResults.categories[0]);
  });

  it("renders search loading and error retry states", () => {
    const retry = jest.fn();
    const { rerender } = render(
      <MapSearchResults
        choices={[]}
        error={false}
        labels={resultLabels()}
        loading
        loadingPopular={false}
        noResults={false}
        onChoose={jest.fn()}
        onRetry={retry}
      />,
    );
    expect(screen.getByText("Searching…")).toBeOnTheScreen();

    rerender(
      <MapSearchResults
        choices={[]}
        error
        labels={resultLabels()}
        loading={false}
        loadingPopular={false}
        noResults={false}
        onChoose={jest.fn()}
        onRetry={retry}
      />,
    );
    fireEvent.press(screen.getByTestId("map-search-retry"));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

"use client";

import { analytics } from "@chinasupply/analytics";
import { useGetCategories, useSearch } from "@chinasupply/api-client";
import { useTranslations } from "next-intl";
import React, {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  createDebouncedSearchUpdater,
  flattenSearchResults,
  getNextSearchOptionIndex,
  getPopularCategoryChoices,
  getSearchResultCount,
  type MapCategory,
  type MapSearchChoice,
} from "./map-search-model";
import {
  MapCategoryChips,
  type MapCategoryChipsLabels,
} from "./map-category-chips";
import {
  MapSearchResults,
  type MapSearchResultLabels,
} from "./map-search-results";

const DISABLED_SEARCH_QUERY = "xx";

export function MapSearch({
  activeCategory,
  onChooseCategory,
  onChoose,
}: Readonly<{
  activeCategory: MapCategory | null;
  onChooseCategory: (category: MapCategory | null) => void;
  onChoose: (choice: MapSearchChoice) => void;
}>) {
  const translate = useTranslations("Map.search");
  const optionIdPrefix = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trackedSearchRef = useRef<string | null>(null);
  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= 2;
  const searchQueryValue = canSearch ? debouncedQuery : "";

  useEffect(() => {
    const updater = createDebouncedSearchUpdater(setDebouncedQuery);

    if (canSearch) {
      updater.schedule(normalizedQuery);
    }

    return () => {
      updater.cancel();
    };
  }, [canSearch, normalizedQuery]);

  const searchQuery = useSearch(
    { q: searchQueryValue || DISABLED_SEARCH_QUERY },
    {
      query: {
        enabled: searchQueryValue.length >= 2,
      },
    },
  );
  const searchResults = searchQuery.data?.data;
  const resultCount =
    searchResults === undefined ? 0 : getSearchResultCount(searchResults);
  const noResults =
    searchQuery.isSuccess && searchQueryValue.length >= 2 && resultCount === 0;
  const categoriesQuery = useGetCategories();
  const choices = (() => {
    if (searchResults !== undefined && resultCount > 0) {
      return flattenSearchResults(searchResults);
    }

    if (noResults && categoriesQuery.data !== undefined) {
      return getPopularCategoryChoices(categoriesQuery.data.data);
    }

    return [];
  })();

  useEffect(() => {
    if (
      !searchQuery.isSuccess ||
      searchResults === undefined ||
      searchQueryValue.length < 2
    ) {
      return;
    }

    const searchIdentity = `${searchQueryValue}:${searchQuery.dataUpdatedAt}`;
    if (trackedSearchRef.current === searchIdentity) return;
    trackedSearchRef.current = searchIdentity;
    analytics.trackSearchPerformed({
      query: searchQueryValue,
      resultCount,
    });
  }, [
    resultCount,
    searchQuery.dataUpdatedAt,
    searchQuery.isSuccess,
    searchQueryValue,
    searchResults,
  ]);

  const labels: MapSearchResultLabels = {
    categories: translate("groups.categories"),
    categoryResult: translate("categoryResult"),
    clusters: translate("groups.clusters"),
    error: translate("error"),
    factories: translate("groups.factories"),
    factoryCount: (count) => translate("factoryCount", { count }),
    loading: translate("loading"),
    loadingPopular: translate("loadingPopular"),
    noResults: translate("noResults"),
    popularCategories: translate("popularCategories"),
    results: translate("results"),
    retry: translate("retry"),
    unverified: translate("unverified"),
    verified: translate("verified"),
  };
  const categoryLabels: MapCategoryChipsLabels = {
    all: translate("categories.all"),
    error: translate("categories.error"),
    group: translate("categories.group"),
    loading: translate("categories.loading"),
    removeCategory: (category) =>
      translate("removeCategory", {
        category,
      }),
    retry: translate("retry"),
  };
  const panelVisible =
    open &&
    canSearch &&
    searchQueryValue === normalizedQuery &&
    (searchQuery.isPending || searchQuery.isError || searchQuery.isSuccess);
  const activeDescendant =
    panelVisible && activeIndex >= 0
      ? `${optionIdPrefix}-${activeIndex}`
      : undefined;

  const choose = (choice: MapSearchChoice) => {
    onChoose(choice);
    setOpen(false);
    setActiveIndex(-1);
  };
  const chooseCategory = (category: MapCategory | null) => {
    onChooseCategory(category);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((currentIndex) =>
        getNextSearchOptionIndex(
          currentIndex,
          choices.length,
          event.key === "ArrowDown" ? "next" : "previous",
        ),
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      const activeChoice = choices[activeIndex];
      if (activeChoice === undefined) return;
      event.preventDefault();
      choose(activeChoice);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget !== null && event.currentTarget.contains(nextTarget)) return;
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="map-search" onBlur={handleBlur}>
      <div className="map-search__input-shell">
        <span aria-hidden="true" className="map-search__icon">
          ⌕
        </span>
        <input
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-controls={`${optionIdPrefix}-panel`}
          aria-expanded={panelVisible}
          aria-label={translate("label")}
          autoComplete="off"
          className="map-search__input"
          maxLength={100}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={translate("placeholder")}
          role="combobox"
          spellCheck={false}
          type="search"
          value={query}
        />
        {query.length === 0 ? null : (
          <button
            aria-label={translate("clear")}
            className="map-search__clear"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setOpen(false);
              setActiveIndex(-1);
            }}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <MapCategoryChips
        activeCategory={activeCategory}
        categories={categoriesQuery.data?.data ?? []}
        error={categoriesQuery.isError}
        labels={categoryLabels}
        loading={categoriesQuery.isPending}
        onChoose={chooseCategory}
        onRetry={() => {
          void categoriesQuery.refetch();
        }}
      />

      {panelVisible ? (
        <div className="map-search__panel" id={`${optionIdPrefix}-panel`}>
          <MapSearchResults
            activeIndex={activeIndex}
            choices={choices}
            error={searchQuery.isError}
            labels={labels}
            loading={searchQuery.isPending}
            loadingPopular={noResults && categoriesQuery.isPending}
            noResults={noResults}
            onChoose={choose}
            onRetry={() => {
              void searchQuery.refetch();
            }}
            optionIdPrefix={optionIdPrefix}
          />
        </div>
      ) : null}
    </div>
  );
}

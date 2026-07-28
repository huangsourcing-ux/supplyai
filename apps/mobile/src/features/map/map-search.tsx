import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { analytics } from "@chinasupply/analytics";
import { useGetCategories, useSearch } from "@chinasupply/api-client";

import {
  MapCategoryChips,
  type MapCategoryChipsLabels,
} from "./map-category-chips";
import {
  createDebouncedSearchUpdater,
  flattenSearchResults,
  getPopularCategoryChoices,
  getSearchResultCount,
  type MapCategory,
  type MapSearchChoice,
} from "./map-search-model";
import {
  MapSearchResults,
  type MapSearchResultLabels,
} from "./map-search-results";

const DISABLED_SEARCH_QUERY = "xx";

export type MapSearchRef = {
  dismiss(): void;
};

export const MapSearch = forwardRef<
  MapSearchRef,
  {
    activeCategory: MapCategory | null;
    onChoose: (choice: MapSearchChoice) => void;
    onChooseCategory: (category: MapCategory | null) => void;
  }
>(function MapSearch({ activeCategory, onChoose, onChooseCategory }, ref) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const trackedSearchRef = useRef<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= 2;
  const searchQueryValue = canSearch ? debouncedQuery : "";

  const dismiss = () => {
    setOpen(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  useImperativeHandle(ref, () => ({ dismiss }));

  useEffect(() => {
    const updater = createDebouncedSearchUpdater(setDebouncedQuery);
    if (canSearch) updater.schedule(normalizedQuery);

    return () => updater.cancel();
  }, [canSearch, normalizedQuery]);

  const searchQuery = useSearch(
    { q: searchQueryValue || DISABLED_SEARCH_QUERY },
    {
      query: {
        enabled: searchQueryValue.length >= 2,
      },
    },
  );
  const categoriesQuery = useGetCategories();
  const searchResults = searchQuery.data?.data;
  const resultCount =
    searchResults === undefined ? 0 : getSearchResultCount(searchResults);
  const noResults =
    searchQuery.isSuccess && searchQueryValue.length >= 2 && resultCount === 0;
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

  const resultLabels: MapSearchResultLabels = {
    categories: t("map.search.groups.categories"),
    categoryResult: t("map.search.categoryResult"),
    clusters: t("map.search.groups.clusters"),
    error: t("map.search.error"),
    factories: t("map.search.groups.factories"),
    factoryCount: (count) => t("map.search.factoryCount", { count }),
    loading: t("map.search.loading"),
    loadingPopular: t("map.search.loadingPopular"),
    noResults: t("map.search.noResults"),
    popularCategories: t("map.search.popularCategories"),
    results: t("map.search.results"),
    retry: t("map.retry"),
    unverified: t("map.search.unverified"),
    verified: t("map.search.verified"),
  };
  const categoryLabels: MapCategoryChipsLabels = {
    all: t("map.search.categories.all"),
    error: t("map.search.categories.error"),
    group: t("map.search.categories.group"),
    loading: t("map.search.categories.loading"),
    removeCategory: (category) => t("map.search.removeCategory", { category }),
    retry: t("map.retry"),
  };
  const panelVisible =
    open &&
    canSearch &&
    searchQueryValue === normalizedQuery &&
    (searchQuery.isPending || searchQuery.isError || searchQuery.isSuccess);

  const choose = (choice: MapSearchChoice) => {
    onChoose(choice);
    dismiss();
  };
  const chooseCategory = (category: MapCategory | null) => {
    onChooseCategory(category);
    dismiss();
  };

  return (
    <View style={styles.root} testID="map-search">
      <View style={styles.inputShell}>
        <Text aria-hidden style={styles.searchIcon}>
          ⌕
        </Text>
        <TextInput
          accessibilityLabel={t("map.search.label")}
          accessibilityRole="combobox"
          accessibilityState={{ expanded: panelVisible }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          onChangeText={(value) => {
            setQuery(value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("map.search.placeholder")}
          placeholderTextColor="#64748B"
          ref={inputRef}
          returnKeyType="search"
          spellCheck={false}
          style={styles.input}
          testID="map-search-input"
          value={query}
        />
        {query.length === 0 ? null : (
          <Pressable
            accessibilityLabel={t("map.search.clear")}
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => {
              setQuery("");
              setDebouncedQuery("");
              dismiss();
            }}
            style={styles.clear}
            testID="map-search-clear"
          >
            <Text aria-hidden style={styles.clearText}>
              ×
            </Text>
          </Pressable>
        )}
      </View>

      <MapCategoryChips
        activeCategory={activeCategory}
        categories={categoriesQuery.data?.data ?? []}
        error={categoriesQuery.isError}
        labels={categoryLabels}
        loading={categoriesQuery.isPending}
        onChoose={chooseCategory}
        onRetry={() => void categoriesQuery.refetch()}
      />

      {panelVisible ? (
        <View style={styles.panel} testID="map-search-panel">
          <MapSearchResults
            choices={choices}
            error={searchQuery.isError}
            labels={resultLabels}
            loading={searchQuery.isPending}
            loadingPopular={noResults && categoriesQuery.isPending}
            noResults={noResults}
            onChoose={choose}
            onRetry={() => void searchQuery.refetch()}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  clear: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  clearText: {
    color: "#475569",
    fontSize: 24,
    lineHeight: 26,
  },
  input: {
    color: "#0F172A",
    flex: 1,
    fontSize: 15,
    height: 48,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderColor: "rgba(71, 85, 79, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    elevation: 5,
    flexDirection: "row",
    height: 48,
    shadowColor: "#33413B",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  panel: {
    backgroundColor: "rgba(255, 255, 255, 0.99)",
    borderColor: "rgba(71, 85, 79, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    elevation: 8,
    marginTop: 8,
    maxHeight: 320,
    overflow: "hidden",
    shadowColor: "#33413B",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.19,
    shadowRadius: 18,
  },
  root: {
    width: "100%",
  },
  searchIcon: {
    color: "#0F766E",
    fontSize: 25,
    lineHeight: 27,
    marginLeft: 14,
  },
});

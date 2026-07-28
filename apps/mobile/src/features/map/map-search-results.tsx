import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { MapSearchChoice } from "./map-search-model";

export type MapSearchResultLabels = {
  categories: string;
  categoryResult: string;
  clusters: string;
  error: string;
  factories: string;
  factoryCount: (count: number) => string;
  loading: string;
  loadingPopular: string;
  noResults: string;
  popularCategories: string;
  results: string;
  retry: string;
  unverified: string;
  verified: string;
};

type SearchResultGroup = {
  choices: MapSearchChoice[];
  key: string;
  label: string;
};

function getChoiceMetadata(
  choice: MapSearchChoice,
  labels: MapSearchResultLabels,
): string {
  if (choice.type === "category") return labels.categoryResult;
  if (choice.type === "cluster") {
    return labels.factoryCount(choice.factoryCount);
  }
  return choice.verified ? labels.verified : labels.unverified;
}

function groupChoices(
  choices: readonly MapSearchChoice[],
  labels: MapSearchResultLabels,
  popular: boolean,
): SearchResultGroup[] {
  if (popular) {
    return [
      {
        choices: choices.filter((choice) => choice.type === "category"),
        key: "popular",
        label: labels.popularCategories,
      },
    ];
  }

  return [
    {
      choices: choices.filter((choice) => choice.type === "category"),
      key: "categories",
      label: labels.categories,
    },
    {
      choices: choices.filter((choice) => choice.type === "cluster"),
      key: "clusters",
      label: labels.clusters,
    },
    {
      choices: choices.filter((choice) => choice.type === "factory"),
      key: "factories",
      label: labels.factories,
    },
  ];
}

export function MapSearchResults({
  choices,
  error,
  labels,
  loading,
  loadingPopular,
  noResults,
  onChoose,
  onRetry,
}: Readonly<{
  choices: readonly MapSearchChoice[];
  error: boolean;
  labels: MapSearchResultLabels;
  loading: boolean;
  loadingPopular: boolean;
  noResults: boolean;
  onChoose: (choice: MapSearchChoice) => void;
  onRetry: () => void;
}>) {
  if (loading) {
    return (
      <SearchStatus
        label={labels.loading}
        loading
        testID="map-search-loading"
      />
    );
  }

  if (error) {
    return (
      <View
        accessibilityRole="alert"
        style={[styles.status, styles.errorStatus]}
        testID="map-search-error"
      >
        <Text style={[styles.statusText, styles.errorText]}>
          {labels.error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retry}
          testID="map-search-retry"
        >
          <Text style={styles.retryText}>{labels.retry}</Text>
        </Pressable>
      </View>
    );
  }

  const groups = groupChoices(choices, labels, noResults);

  return (
    <ScrollView
      accessibilityLabel={labels.results}
      accessibilityRole="list"
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      testID="map-search-results"
    >
      {noResults ? (
        <Text accessibilityLiveRegion="polite" style={styles.empty}>
          {labels.noResults}
        </Text>
      ) : null}

      {loadingPopular ? (
        <SearchStatus
          label={labels.loadingPopular}
          loading
          testID="map-search-popular-loading"
        />
      ) : null}

      {groups.map((group) => {
        if (group.choices.length === 0) return null;

        return (
          <View
            accessibilityLabel={group.label}
            key={group.key}
            style={styles.group}
            testID={`map-search-group-${group.key}`}
          >
            <Text accessibilityRole="header" style={styles.groupLabel}>
              {group.label}
            </Text>
            {group.choices.map((choice) => {
              const metadata = getChoiceMetadata(choice, labels);

              return (
                <Pressable
                  accessibilityLabel={`${choice.name}, ${metadata}`}
                  accessibilityRole="button"
                  key={`${choice.type}-${choice.id}`}
                  onPress={() => onChoose(choice)}
                  style={styles.option}
                  testID={`map-search-result-${choice.type}-${choice.slug}`}
                >
                  <Text numberOfLines={1} style={styles.optionName}>
                    {choice.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.optionMetadata}>
                    {metadata}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

function SearchStatus({
  label,
  loading,
  testID,
}: Readonly<{ label: string; loading: boolean; testID: string }>) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={styles.status}
      testID={testID}
    >
      {loading ? <ActivityIndicator color="#0F766E" size="small" /> : null}
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    paddingBottom: 4,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  errorStatus: {
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#991B1B",
  },
  group: {
    paddingBottom: 5,
  },
  groupLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    textTransform: "uppercase",
  },
  list: {
    paddingBottom: 8,
  },
  option: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  optionMetadata: {
    color: "#64748B",
    flexShrink: 1,
    fontSize: 12,
    textAlign: "right",
  },
  optionName: {
    color: "#0F172A",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  retry: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8,
  },
  retryText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800",
  },
  status: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusText: {
    color: "#334155",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
});

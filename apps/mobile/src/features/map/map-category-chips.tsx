import type { GetCategories200DataItem } from "@chinasupply/api-client";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  resolveCategoryChipSelection,
  type MapCategory,
} from "./map-search-model";

export type MapCategoryChipsLabels = {
  all: string;
  error: string;
  group: string;
  loading: string;
  removeCategory: (category: string) => string;
  retry: string;
};

export function MapCategoryChips({
  activeCategory,
  categories,
  error,
  labels,
  loading,
  onChoose,
  onRetry,
}: Readonly<{
  activeCategory: MapCategory | null;
  categories: readonly GetCategories200DataItem[];
  error: boolean;
  labels: MapCategoryChipsLabels;
  loading: boolean;
  onChoose: (category: MapCategory | null) => void;
  onRetry: () => void;
}>) {
  const selection = resolveCategoryChipSelection(categories, activeCategory);

  return (
    <ScrollView
      accessibilityLabel={labels.group}
      accessibilityRole="list"
      contentContainerStyle={styles.content}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      testID="map-category-chips"
    >
      <CategoryChip
        label={labels.all}
        onPress={() => onChoose(null)}
        selected={selection.kind === "all"}
        testID="map-category-all"
      />

      {categories.map((category) => (
        <CategoryChip
          color={category.color}
          key={category.id}
          label={category.name}
          onPress={() => onChoose({ name: category.name, slug: category.slug })}
          selected={
            selection.kind === "root" && selection.slug === category.slug
          }
          testID={`map-category-${category.slug}`}
        />
      ))}

      {selection.kind === "child" && activeCategory !== null ? (
        <Pressable
          accessibilityLabel={labels.removeCategory(activeCategory.name)}
          accessibilityRole="button"
          onPress={() => onChoose(null)}
          style={[styles.chip, styles.childChip]}
          testID="map-category-child"
        >
          <Text style={[styles.chipText, styles.childChipText]}>
            {activeCategory.name}
          </Text>
          <Text aria-hidden style={[styles.chipText, styles.childChipText]}>
            ×
          </Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.status}
          testID="map-categories-loading"
        >
          <ActivityIndicator color="#0F766E" size="small" />
          <Text style={styles.statusText}>{labels.loading}</Text>
        </View>
      ) : null}

      {error ? (
        <View
          accessibilityRole="alert"
          style={[styles.status, styles.errorStatus]}
          testID="map-categories-error"
        >
          <Text style={[styles.statusText, styles.errorText]}>
            {labels.error}
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={onRetry}
            style={styles.retry}
          >
            <Text style={styles.retryText}>{labels.retry}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function CategoryChip({
  color,
  label,
  onPress,
  selected,
  testID,
}: Readonly<{
  color?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selectedChip : null]}
      testID={testID}
    >
      {color === undefined ? null : (
        <View
          aria-hidden
          style={[styles.color, { backgroundColor: color }]}
          testID={`${testID}-color`}
        />
      )}
      <Text
        style={[styles.chipText, selected ? styles.selectedChipText : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  childChip: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  childChipText: {
    color: "#FFFFFF",
  },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(71, 85, 79, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  chipText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
  },
  color: {
    borderColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 999,
    borderWidth: 1,
    height: 12,
    width: 12,
  },
  content: {
    alignItems: "center",
    gap: 8,
    paddingRight: 1,
  },
  errorStatus: {
    backgroundColor: "rgba(254, 226, 226, 0.96)",
  },
  errorText: {
    color: "#991B1B",
  },
  retry: {
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 4,
  },
  retryText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
  },
  scroller: {
    marginTop: 8,
  },
  selectedChip: {
    backgroundColor: "#ECFDF5",
    borderColor: "#0F766E",
  },
  selectedChipText: {
    color: "#115E59",
  },
  status: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  statusText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
});

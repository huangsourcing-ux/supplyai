import type { GetCategories200DataItem } from "@chinasupply/api-client";
import { useGetCategories } from "@chinasupply/api-client";
import { type Href, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryIcon } from "./category-icon";
import { EXPLORE_STALE_TIME_MS } from "./explore-model";

function hexToTint(color: string): string {
  return `${color}1F`;
}

export function ExploreCategoryCard({
  category,
  onPress,
}: Readonly<{
  category: GetCategories200DataItem;
  onPress: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <View style={styles.gridCell}>
      <Pressable
        accessibilityLabel={t("explore.openCategory", {
          name: category.name,
        })}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.categoryCard,
          { borderTopColor: category.color },
          pressed ? styles.categoryCardPressed : null,
        ]}
        testID={`explore-category-${category.slug}`}
      >
        <View
          style={[
            styles.iconTile,
            { backgroundColor: hexToTint(category.color) },
          ]}
          testID={`explore-category-color-${category.slug}`}
        >
          <CategoryIcon color={category.color} icon={category.icon} />
        </View>
        <Text numberOfLines={2} style={styles.categoryName}>
          {category.name}
        </Text>
        <Text aria-hidden style={styles.categoryArrow}>
          →
        </Text>
      </Pressable>
    </View>
  );
}

function ExploreState({
  kind,
  onRetry,
}: Readonly<{
  kind: "empty" | "error" | "loading";
  onRetry?: () => void;
}>) {
  const { t } = useTranslation();

  if (kind === "loading") {
    return (
      <View
        accessibilityLabel={t("explore.loading")}
        accessibilityRole="progressbar"
        style={styles.stateCard}
        testID="explore-loading"
      >
        <ActivityIndicator color="#0F766E" size="large" />
        <Text style={styles.stateDescription}>{t("explore.loading")}</Text>
      </View>
    );
  }

  const prefix = kind === "error" ? "explore.error" : "explore.empty";
  return (
    <View
      accessibilityRole={kind === "error" ? "alert" : undefined}
      style={styles.stateCard}
      testID={`explore-${kind}`}
    >
      <Text accessibilityRole="header" style={styles.stateTitle}>
        {t(`${prefix}.title`)}
      </Text>
      <Text style={styles.stateDescription}>{t(`${prefix}.description`)}</Text>
      {kind === "error" && onRetry !== undefined ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>{t("explore.error.retry")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const categoriesQuery = useGetCategories({
    query: { staleTime: EXPLORE_STALE_TIME_MS },
  });
  const categories = categoriesQuery.data?.data ?? [];

  let emptyComponent = null;
  if (categoriesQuery.isPending) {
    emptyComponent = <ExploreState kind="loading" />;
  } else if (categoriesQuery.isError) {
    emptyComponent = (
      <ExploreState
        kind="error"
        onRetry={() => void categoriesQuery.refetch()}
      />
    );
  } else if (categories.length === 0) {
    emptyComponent = <ExploreState kind="empty" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <FlatList
        ListEmptyComponent={emptyComponent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {t("explore.title")}
            </Text>
            <Text style={styles.description}>{t("explore.description")}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={categories}
        keyExtractor={(category) => category.id}
        numColumns={2}
        renderItem={({ item }) => (
          <ExploreCategoryCard
            category={item}
            onPress={() =>
              router.push({
                pathname: "/explore/[slug]",
                params: { slug: item.slug },
              } as unknown as Href)
            }
          />
        )}
        showsVerticalScrollIndicator={false}
        testID="explore-category-grid"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  categoryArrow: {
    color: "#0F766E",
    fontSize: 18,
    fontWeight: "800",
    marginTop: "auto",
    paddingTop: 14,
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 118, 110, 0.12)",
    borderRadius: 16,
    borderTopWidth: 4,
    borderWidth: 1,
    minHeight: 174,
    padding: 16,
  },
  categoryCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  categoryName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 14,
  },
  description: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
    maxWidth: 560,
  },
  gridCell: {
    padding: 6,
    width: "50%",
  },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 12,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 10,
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  stateCard: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 118, 110, 0.14)",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 44,
    maxWidth: 480,
    padding: 24,
    width: "94%",
  },
  stateDescription: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center",
  },
  stateTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 25,
    textAlign: "center",
  },
  title: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 36,
  },
});

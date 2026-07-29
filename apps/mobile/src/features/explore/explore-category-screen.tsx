import {
  getClusters,
  type GetCategories200DataItem,
  type GetClusters200DataItem,
  useGetCategories,
} from "@chinasupply/api-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryIcon } from "./category-icon";
import {
  EXPLORE_CLUSTER_PAGE_SIZE,
  EXPLORE_STALE_TIME_MS,
  findRootExploreCategory,
  flattenExploreClusterPages,
  getNextExploreClusterCursor,
  normalizeExploreCategorySlug,
} from "./explore-model";

export function ExploreBackButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.backButton}
      testID="explore-category-back"
    >
      <Text aria-hidden style={styles.backArrow}>
        ←
      </Text>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

export function ExploreClusterCard({
  cluster,
  onViewDetails,
}: Readonly<{
  cluster: GetClusters200DataItem;
  onViewDetails: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <View style={styles.clusterCard} testID={`explore-cluster-${cluster.slug}`}>
      <View style={styles.clusterImageFrame}>
        {cluster.coverImageUrl === null ? (
          <View
            style={[
              styles.clusterImagePlaceholder,
              { backgroundColor: `${cluster.primaryCategory.color}1F` },
            ]}
          >
            <CategoryIcon
              color={cluster.primaryCategory.color}
              icon={cluster.primaryCategory.icon}
              size={34}
            />
          </View>
        ) : (
          <Image
            accessibilityLabel={t("explore.category.imageAlt", {
              name: cluster.name,
            })}
            accessible
            resizeMode="cover"
            source={{ uri: cluster.coverImageUrl }}
            style={styles.clusterImage}
          />
        )}
      </View>
      <View style={styles.clusterContent}>
        <View style={styles.clusterHeading}>
          <View style={styles.clusterIdentity}>
            <Text accessibilityRole="header" style={styles.clusterName}>
              {cluster.name}
            </Text>
            <Text style={styles.clusterRegion}>{cluster.region.name}</Text>
          </View>
          <View style={styles.factoryBadge}>
            <Text style={styles.factoryBadgeText}>
              {t("explore.category.factoryCount", {
                count: cluster.factoryCount,
              })}
            </Text>
          </View>
        </View>
        <Text numberOfLines={3} style={styles.clusterSummary}>
          {cluster.summary}
        </Text>
        <Text style={styles.productsLabel}>
          {t("explore.category.mainProducts")}
        </Text>
        <Text numberOfLines={2} style={styles.products}>
          {cluster.mainProducts.join(" · ")}
        </Text>
        <Pressable
          accessibilityLabel={t("explore.category.viewDetailsLabel", {
            name: cluster.name,
          })}
          accessibilityRole="button"
          onPress={onViewDetails}
          style={styles.detailsButton}
          testID={`explore-cluster-details-${cluster.slug}`}
        >
          <Text style={styles.detailsButtonText}>
            {t("explore.category.viewDetails")} →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ExploreCategoryState({
  kind,
  onBack,
  onRetry,
}: Readonly<{
  kind: "error" | "loading" | "unavailable";
  onBack: () => void;
  onRetry?: () => void;
}>) {
  const { t } = useTranslation();

  if (kind === "loading") {
    return (
      <View style={styles.stateShell} testID="explore-category-loading">
        <ExploreBackButton
          label={t("explore.category.back")}
          onPress={onBack}
        />
        <View
          accessibilityLabel={t("explore.category.loading")}
          accessibilityRole="progressbar"
          style={styles.loadingState}
        >
          <ActivityIndicator color="#0F766E" size="large" />
          <Text style={styles.stateDescription}>
            {t("explore.category.loading")}
          </Text>
        </View>
      </View>
    );
  }

  const prefix =
    kind === "unavailable"
      ? "explore.category.unavailable"
      : "explore.category.serviceError";

  return (
    <View style={styles.stateShell}>
      <ExploreBackButton label={t("explore.category.back")} onPress={onBack} />
      <View
        accessibilityRole={kind === "error" ? "alert" : undefined}
        style={styles.messageState}
        testID={`explore-category-${kind}`}
      >
        <Text accessibilityRole="header" style={styles.stateTitle}>
          {t(`${prefix}.title`)}
        </Text>
        <Text style={styles.stateDescription}>
          {t(`${prefix}.description`)}
        </Text>
        {kind === "error" && onRetry !== undefined ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {t("explore.category.retry")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ExploreListMessage({
  categoryName,
  kind,
  onRetry,
}: Readonly<{
  categoryName: string;
  kind: "all-loaded" | "empty" | "loading-more" | "more-error";
  onRetry?: () => void;
}>) {
  const { t } = useTranslation();

  if (kind === "empty") {
    return (
      <View style={styles.emptyState} testID="explore-clusters-empty">
        <Text accessibilityRole="header" style={styles.stateTitle}>
          {t("explore.category.empty.title")}
        </Text>
        <Text style={styles.stateDescription}>
          {t("explore.category.empty.description", { name: categoryName })}
        </Text>
      </View>
    );
  }

  const label =
    kind === "all-loaded"
      ? t("explore.category.allLoaded")
      : kind === "loading-more"
        ? t("explore.category.loadingMore")
        : t("explore.category.loadError");

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={kind === "more-error" ? "alert" : undefined}
      style={styles.listMessage}
      testID={`explore-clusters-${kind}`}
    >
      {kind === "loading-more" ? (
        <ActivityIndicator color="#0F766E" size="small" />
      ) : null}
      <Text style={styles.listMessageText}>{label}</Text>
      {onRetry === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.inlineRetry}
        >
          <Text style={styles.inlineRetryText}>
            {t("explore.category.retry")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function ExploreCategoryLoaded({
  category,
  clusters,
  hasNextPage,
  isFetchNextPageError,
  isFetchingNextPage,
  onBack,
  onFetchNextPage,
  onViewDetails,
}: Readonly<{
  category: GetCategories200DataItem;
  clusters: readonly GetClusters200DataItem[];
  hasNextPage: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  onBack: () => void;
  onFetchNextPage: () => void;
  onViewDetails: (slug: string) => void;
}>) {
  const { t } = useTranslation();

  let footer = null;
  if (isFetchNextPageError) {
    footer = (
      <ExploreListMessage
        categoryName={category.name}
        kind="more-error"
        onRetry={onFetchNextPage}
      />
    );
  } else if (isFetchingNextPage) {
    footer = (
      <ExploreListMessage categoryName={category.name} kind="loading-more" />
    );
  } else if (hasNextPage) {
    footer = (
      <Pressable
        accessibilityRole="button"
        onPress={onFetchNextPage}
        style={styles.loadMoreButton}
      >
        <Text style={styles.loadMoreText}>
          {t("explore.category.loadMore")}
        </Text>
      </Pressable>
    );
  } else if (clusters.length > 0) {
    footer = (
      <ExploreListMessage categoryName={category.name} kind="all-loaded" />
    );
  }

  return (
    <FlatList
      ListEmptyComponent={
        <ExploreListMessage categoryName={category.name} kind="empty" />
      }
      ListFooterComponent={footer}
      ListHeaderComponent={
        <View style={styles.header}>
          <ExploreBackButton
            label={t("explore.category.back")}
            onPress={onBack}
          />
          <View
            style={[
              styles.categoryIconTile,
              { backgroundColor: `${category.color}1F` },
            ]}
          >
            <CategoryIcon color={category.color} icon={category.icon} />
          </View>
          <Text style={styles.eyebrow}>{t("explore.category.eyebrow")}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {t("explore.category.title", { name: category.name })}
          </Text>
          <Text style={styles.description}>
            {t("explore.category.description")}
          </Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      data={[...clusters]}
      keyExtractor={(cluster) => cluster.id}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) onFetchNextPage();
      }}
      onEndReachedThreshold={0.45}
      removeClippedSubviews={false}
      renderItem={({ item }) => (
        <ExploreClusterCard
          cluster={item}
          onViewDetails={() => onViewDetails(item.slug)}
        />
      )}
      showsVerticalScrollIndicator={false}
      testID="explore-cluster-list"
    />
  );
}

export default function ExploreCategoryScreen() {
  const { slug: routeSlug } = useLocalSearchParams<{
    slug?: string | string[];
  }>();
  const router = useRouter();
  const slug = normalizeExploreCategorySlug(routeSlug);
  const categoriesQuery = useGetCategories({
    query: { staleTime: EXPLORE_STALE_TIME_MS },
  });
  const category =
    slug === null || categoriesQuery.data === undefined
      ? undefined
      : findRootExploreCategory(categoriesQuery.data.data, slug);
  const clustersQuery = useInfiniteQuery({
    enabled: category !== undefined,
    getNextPageParam: getNextExploreClusterCursor,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getClusters(
        {
          category: slug ?? "",
          limit: EXPLORE_CLUSTER_PAGE_SIZE,
          ...(pageParam === null ? {} : { cursor: pageParam }),
        },
        { signal },
      ),
    queryKey: ["explore-clusters", slug, EXPLORE_CLUSTER_PAGE_SIZE],
    staleTime: EXPLORE_STALE_TIME_MS,
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/explore" as Href);
  };

  let content;
  if (slug === null) {
    content = <ExploreCategoryState kind="unavailable" onBack={goBack} />;
  } else if (categoriesQuery.isError) {
    content = (
      <ExploreCategoryState
        kind="error"
        onBack={goBack}
        onRetry={() => void categoriesQuery.refetch()}
      />
    );
  } else if (categoriesQuery.data === undefined) {
    content = <ExploreCategoryState kind="loading" onBack={goBack} />;
  } else if (category === undefined) {
    content = <ExploreCategoryState kind="unavailable" onBack={goBack} />;
  } else if (clustersQuery.isError && clustersQuery.data === undefined) {
    content = (
      <ExploreCategoryState
        kind="error"
        onBack={goBack}
        onRetry={() => void clustersQuery.refetch()}
      />
    );
  } else if (clustersQuery.data === undefined) {
    content = <ExploreCategoryState kind="loading" onBack={goBack} />;
  } else {
    const clusters = flattenExploreClusterPages(clustersQuery.data.pages);
    content = (
      <ExploreCategoryLoaded
        category={category}
        clusters={clusters}
        hasNextPage={clustersQuery.hasNextPage}
        isFetchNextPageError={clustersQuery.isFetchNextPageError}
        isFetchingNextPage={clustersQuery.isFetchingNextPage}
        onBack={goBack}
        onFetchNextPage={() => void clustersQuery.fetchNextPage()}
        onViewDetails={(clusterSlug) =>
          router.push({
            pathname: "/clusters/[slug]",
            params: { slug: clusterSlug },
          } as unknown as Href)
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backArrow: {
    color: "#0F766E",
    fontSize: 19,
    marginRight: 8,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    minHeight: 44,
    paddingRight: 12,
  },
  backText: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "800",
  },
  categoryIconTile: {
    alignItems: "center",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    marginTop: 18,
    width: 52,
  },
  clusterCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 118, 110, 0.13)",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    marginHorizontal: 18,
    overflow: "hidden",
  },
  clusterContent: {
    padding: 16,
  },
  clusterHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  clusterIdentity: {
    flex: 1,
    marginRight: 10,
  },
  clusterImage: {
    height: "100%",
    width: "100%",
  },
  clusterImageFrame: {
    backgroundColor: "#E2E8F0",
    height: 150,
  },
  clusterImagePlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  clusterName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  clusterRegion: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
  },
  clusterSummary: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
  description: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  detailsButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    marginTop: 12,
  },
  detailsButtonText: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 118, 110, 0.13)",
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 12,
    padding: 24,
  },
  eyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginTop: 16,
    textTransform: "uppercase",
  },
  factoryBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  factoryBadgeText: {
    color: "#047857",
    fontSize: 11,
    fontWeight: "800",
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  inlineRetry: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inlineRetryText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800",
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  listMessage: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: 20,
  },
  listMessageText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 8,
    textAlign: "center",
  },
  loadMoreButton: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "rgba(15, 118, 110, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    marginVertical: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  loadMoreText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800",
  },
  loadingState: {
    alignItems: "center",
    paddingTop: 70,
  },
  messageState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 118, 110, 0.13)",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 36,
    padding: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 10,
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  products: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 3,
  },
  productsLabel: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 14,
    textTransform: "uppercase",
  },
  safeArea: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  stateDescription: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    textAlign: "center",
  },
  stateShell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  stateTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    textAlign: "center",
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 34,
    marginTop: 7,
  },
});

import { useInfiniteQuery } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
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

import { analytics } from "@chinasupply/analytics";
import {
  getClusterFactories,
  type GetCluster200Data,
  type GetClusterFactories200DataItem,
  useGetCluster,
} from "@chinasupply/api-client";

import { ClusterBoundaryMap } from "./cluster-boundary-map";
import {
  CLUSTER_DETAIL_STALE_TIME_MS,
  CLUSTER_FACTORY_PAGE_SIZE,
  flattenFactoryPages,
  formatClusterFactoryCount,
  formatClusterStats,
  getNextFactoryCursor,
  normalizeClusterSlug,
} from "./cluster-detail-model";
import { ClusterMarkdown } from "./cluster-markdown";

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

export function ClusterDetailBackButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.backButton}
      testID="cluster-detail-back"
    >
      <Text aria-hidden style={styles.backArrow}>
        ←
      </Text>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

export function ClusterDetailState({
  kind,
  onBack,
  onRetry,
}: Readonly<{
  kind: "error" | "loading" | "not-found";
  onBack: () => void;
  onRetry?: () => void;
}>) {
  const { t } = useTranslation();

  if (kind === "loading") {
    return (
      <View style={styles.stateShell} testID="cluster-detail-loading">
        <ClusterDetailBackButton
          label={t("clusterDetail.backToMap")}
          onPress={onBack}
        />
        <View
          accessibilityLabel={t("clusterDetail.loading")}
          accessibilityRole="progressbar"
          style={styles.loadingState}
        >
          <ActivityIndicator color="#0F766E" size="large" />
          <View style={[styles.skeleton, styles.skeletonTitle]} />
          <View style={[styles.skeleton, styles.skeletonLine]} />
          <View style={[styles.skeleton, styles.skeletonMap]} />
        </View>
      </View>
    );
  }

  const prefix =
    kind === "not-found" ? "clusterDetail.notFound" : "clusterDetail.error";

  return (
    <View accessibilityRole="alert" style={styles.stateShell}>
      <ClusterDetailBackButton
        label={t(`${prefix}.backToMap`)}
        onPress={onBack}
      />
      <View style={styles.messageState} testID={`cluster-detail-${kind}`}>
        <Text style={styles.messageEyebrow}>{t(`${prefix}.eyebrow`)}</Text>
        <Text accessibilityRole="header" style={styles.messageTitle}>
          {t(`${prefix}.title`)}
        </Text>
        <Text style={styles.messageDescription}>
          {t(`${prefix}.description`)}
        </Text>
        {kind === "error" && onRetry !== undefined ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {t("clusterDetail.error.retry")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ClusterFactoryCard({
  factory,
  onViewDetails,
}: Readonly<{
  factory: GetClusterFactories200DataItem;
  onViewDetails: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityLabel={factory.name}
      style={styles.factoryCard}
      testID={`cluster-factory-${factory.slug}`}
    >
      <View style={styles.factoryImageFrame}>
        {factory.imageUrl === null ? (
          <View style={styles.factoryImagePlaceholder}>
            <Text style={styles.factoryImageLetter}>
              {factory.name.charAt(0)}
            </Text>
          </View>
        ) : (
          <Image
            accessibilityLabel={t("clusterDetail.factories.imageAlt", {
              name: factory.name,
            })}
            accessible
            resizeMode="cover"
            source={{ uri: factory.imageUrl }}
            style={styles.factoryImage}
          />
        )}
      </View>
      <View style={styles.factoryContent}>
        <View style={styles.factoryHeading}>
          <Text accessibilityRole="header" style={styles.factoryName}>
            {factory.name}
          </Text>
          <View
            style={
              factory.verified ? styles.verifiedBadge : styles.unverifiedBadge
            }
          >
            <Text
              style={
                factory.verified
                  ? styles.verifiedBadgeText
                  : styles.unverifiedBadgeText
              }
            >
              {t(
                factory.verified
                  ? "clusterDetail.factories.verified"
                  : "clusterDetail.factories.unverified",
              )}
            </Text>
          </View>
        </View>
        <Text style={styles.factoryRegion}>{factory.region.name}</Text>
        <View
          accessibilityLabel={t("clusterDetail.factories.mainProducts", {
            name: factory.name,
          })}
          style={styles.factoryProducts}
        >
          {factory.mainProducts.map((product, index) => (
            <View key={`${factory.id}-${product}-${index}`} style={styles.chip}>
              <Text style={styles.chipText}>{product}</Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onViewDetails}
          style={styles.factoryAction}
          testID={`cluster-factory-details-${factory.slug}`}
        >
          <Text style={styles.factoryActionText}>
            {t("clusterDetail.factories.viewDetails")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ClusterDetailHeader({
  cluster,
  onBack,
}: Readonly<{
  cluster: GetCluster200Data;
  onBack: () => void;
}>) {
  const { t } = useTranslation();
  const stats = formatClusterStats(cluster.stats);

  return (
    <View>
      <View style={styles.heroSection}>
        <ClusterDetailBackButton
          label={t("clusterDetail.backToMap")}
          onPress={onBack}
        />
        <Text style={styles.eyebrow}>{cluster.primaryCategory.name}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {cluster.name}
        </Text>
        <Text style={styles.location}>
          {t("clusterDetail.location", { city: cluster.region.name })}
        </Text>
        <Text style={styles.summary}>{cluster.summary}</Text>
        <Pressable
          accessibilityHint={t("clusterDetail.save.unavailable")}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={styles.savePlaceholder}
          testID="cluster-save-placeholder"
        >
          <Text aria-hidden style={styles.saveIcon}>
            ♡
          </Text>
          <Text style={styles.savePlaceholderText}>
            {t("clusterDetail.save.action")}
          </Text>
        </Pressable>
        <Text style={styles.saveHint}>
          {t("clusterDetail.save.unavailable")}
        </Text>
      </View>

      <View style={styles.section}>
        <ClusterBoundaryMap
          boundary={cluster.boundary}
          centroid={cluster.centroid}
          color={cluster.primaryCategory.color}
          name={cluster.name}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>
          {t("clusterDetail.productsHeading")}
        </Text>
        <View style={styles.productList}>
          {cluster.mainProducts.map((product, index) => (
            <View key={`${product}-${index}`} style={styles.productChip}>
              <Text style={styles.productChipText}>{product}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("clusterDetail.stats.heading")}
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              {t("clusterDetail.stats.factoryCount")}
            </Text>
            <Text style={styles.statValue}>
              {formatClusterFactoryCount(cluster.factoryCount)}
            </Text>
          </View>
          {stats.annualOutput === null ? null : (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {t("clusterDetail.stats.annualOutput")}
              </Text>
              <Text style={styles.statValue}>{stats.annualOutput}</Text>
            </View>
          )}
          {stats.exportShare === null ? null : (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {t("clusterDetail.stats.exportShare")}
              </Text>
              <Text style={styles.statValue}>{stats.exportShare}</Text>
            </View>
          )}
        </View>
        {cluster.stats?.note === undefined ? null : (
          <Text style={styles.statsNote}>{cluster.stats.note}</Text>
        )}
      </View>

      {cluster.description === null ? null : (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t("clusterDetail.aboutHeading")}
          </Text>
          <ClusterMarkdown
            imageFallbackAlt={t("clusterDetail.descriptionImageAlt", {
              name: cluster.name,
            })}
            markdown={cluster.description}
          />
        </View>
      )}

      <View style={[styles.section, styles.factoriesHeading]}>
        <Text style={styles.sectionEyebrow}>{cluster.region.name}</Text>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("clusterDetail.factories.heading")}
        </Text>
      </View>
    </View>
  );
}

function FactoryListMessage({
  kind,
  onRetry,
}: Readonly<{
  kind: "all-loaded" | "empty" | "initial-error" | "loading" | "more-error";
  onRetry?: () => void;
}>) {
  const { t } = useTranslation();
  const key =
    kind === "all-loaded"
      ? "allLoaded"
      : kind === "empty"
        ? "empty"
        : kind === "initial-error"
          ? "loadInitialError"
          : kind === "more-error"
            ? "loadError"
            : "loading";

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={kind.includes("error") ? "alert" : undefined}
      style={styles.listMessage}
      testID={`cluster-factories-${kind}`}
    >
      {kind === "loading" ? (
        <ActivityIndicator color="#0F766E" size="small" />
      ) : null}
      <Text style={styles.listMessageText}>
        {t(`clusterDetail.factories.${key}`)}
      </Text>
      {onRetry === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.inlineRetry}
        >
          <Text style={styles.inlineRetryText}>
            {t("clusterDetail.factories.retry")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function ClusterDetailLoaded({
  cluster,
  factories,
  hasNextPage,
  isFetchNextPageError,
  isFetchingNextPage,
  isInitialFactoriesError,
  isInitialFactoriesLoading,
  onBack,
  onFactoryDetails,
  onFetchNextPage,
  onRetryFactories,
}: Readonly<{
  cluster: GetCluster200Data;
  factories: GetClusterFactories200DataItem[];
  hasNextPage: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isInitialFactoriesError: boolean;
  isInitialFactoriesLoading: boolean;
  onBack: () => void;
  onFactoryDetails: (slug: string) => void;
  onFetchNextPage: () => void;
  onRetryFactories: () => void;
}>) {
  const { t } = useTranslation();
  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    onFetchNextPage();
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage]);

  let footer = null;
  if (isInitialFactoriesLoading) {
    footer = <FactoryListMessage kind="loading" />;
  } else if (isInitialFactoriesError) {
    footer = (
      <FactoryListMessage kind="initial-error" onRetry={onRetryFactories} />
    );
  } else if (isFetchingNextPage) {
    footer = <FactoryListMessage kind="loading" />;
  } else if (isFetchNextPageError) {
    footer = <FactoryListMessage kind="more-error" onRetry={fetchNextPage} />;
  } else if (hasNextPage) {
    footer = (
      <Pressable
        accessibilityRole="button"
        onPress={fetchNextPage}
        style={styles.loadMoreButton}
      >
        <Text style={styles.loadMoreText}>
          {t("clusterDetail.factories.loadMore")}
        </Text>
      </Pressable>
    );
  } else if (factories.length > 0) {
    footer = <FactoryListMessage kind="all-loaded" />;
  }

  return (
    <FlatList
      ListEmptyComponent={
        isInitialFactoriesLoading || isInitialFactoriesError ? null : (
          <FactoryListMessage kind="empty" />
        )
      }
      ListFooterComponent={footer}
      ListHeaderComponent={
        <ClusterDetailHeader cluster={cluster} onBack={onBack} />
      }
      contentContainerStyle={styles.listContent}
      data={factories}
      keyExtractor={(factory) => factory.id}
      onEndReached={fetchNextPage}
      onEndReachedThreshold={0.45}
      removeClippedSubviews={false}
      renderItem={({ item }) => (
        <ClusterFactoryCard
          factory={item}
          onViewDetails={() => onFactoryDetails(item.slug)}
        />
      )}
      showsVerticalScrollIndicator={false}
      testID="cluster-detail-list"
    />
  );
}

export default function ClusterDetailScreen() {
  const { slug: routeSlug } = useLocalSearchParams<{
    slug?: string | string[];
  }>();
  const router = useRouter();
  const slug = normalizeClusterSlug(routeSlug);
  const clusterQuery = useGetCluster(slug ?? "", {
    query: {
      enabled: slug !== null,
      staleTime: CLUSTER_DETAIL_STALE_TIME_MS,
    },
  });
  const factoriesQuery = useInfiniteQuery({
    enabled: slug !== null,
    getNextPageParam: getNextFactoryCursor,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getClusterFactories(
        slug ?? "",
        {
          limit: CLUSTER_FACTORY_PAGE_SIZE,
          ...(pageParam === null ? {} : { cursor: pageParam }),
        },
        { signal },
      ),
    queryKey: ["cluster-detail-factories", slug, CLUSTER_FACTORY_PAGE_SIZE],
    staleTime: CLUSTER_DETAIL_STALE_TIME_MS,
  });
  const trackedIdentity = useRef<string | null>(null);
  const cluster = clusterQuery.data?.data;

  useEffect(() => {
    if (cluster === undefined) return;
    const identity = `${cluster.id}:${cluster.slug}`;
    if (trackedIdentity.current === identity) return;
    trackedIdentity.current = identity;
    analytics.trackClusterViewed({ clusterId: cluster.id, slug: cluster.slug });
  }, [cluster]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  let content;
  if (slug === null || isNotFoundError(clusterQuery.error)) {
    content = <ClusterDetailState kind="not-found" onBack={goBack} />;
  } else if (clusterQuery.isError) {
    content = (
      <ClusterDetailState
        kind="error"
        onBack={goBack}
        onRetry={() => {
          void clusterQuery.refetch();
        }}
      />
    );
  } else if (cluster === undefined) {
    content = <ClusterDetailState kind="loading" onBack={goBack} />;
  } else {
    const factories = flattenFactoryPages(factoriesQuery.data?.pages ?? []);
    content = (
      <ClusterDetailLoaded
        cluster={cluster}
        factories={factories}
        hasNextPage={factoriesQuery.hasNextPage}
        isFetchNextPageError={factoriesQuery.isFetchNextPageError}
        isFetchingNextPage={factoriesQuery.isFetchingNextPage}
        isInitialFactoriesError={
          factoriesQuery.isError && factoriesQuery.data === undefined
        }
        isInitialFactoriesLoading={
          factoriesQuery.isPending && factoriesQuery.data === undefined
        }
        onBack={goBack}
        onFactoryDetails={(factorySlug) => {
          router.push({
            pathname: "/factories/[slug]",
            params: { slug: factorySlug },
          } as unknown as Href);
        }}
        onFetchNextPage={() => {
          void factoriesQuery.fetchNextPage();
        }}
        onRetryFactories={() => {
          void factoriesQuery.refetch();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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
  chip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipText: {
    color: "#475569",
    fontSize: 11,
  },
  eyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginTop: 14,
    textTransform: "uppercase",
  },
  factoriesHeading: {
    borderBottomWidth: 0,
    paddingBottom: 12,
  },
  factoryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 118, 110, 0.13)",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    marginHorizontal: 18,
    overflow: "hidden",
  },
  factoryContent: {
    padding: 16,
  },
  factoryAction: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 9,
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  factoryActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  factoryHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  factoryImage: {
    height: "100%",
    width: "100%",
  },
  factoryImageFrame: {
    backgroundColor: "#E2E8F0",
    height: 150,
  },
  factoryImageLetter: {
    color: "#0F766E",
    fontSize: 32,
    fontWeight: "800",
  },
  factoryImagePlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  factoryName: {
    color: "#0F172A",
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
    marginRight: 10,
  },
  factoryProducts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  factoryRegion: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
  },
  heroSection: {
    paddingBottom: 18,
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
    paddingBottom: 32,
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
  location: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  messageDescription: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    textAlign: "center",
  },
  messageEyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  messageState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 80,
    paddingHorizontal: 26,
  },
  messageTitle: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 33,
    marginTop: 10,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 10,
    marginTop: 22,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  productChip: {
    backgroundColor: "#CCFBF1",
    borderColor: "rgba(15, 118, 110, 0.15)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  productChipText: {
    color: "#115E59",
    fontSize: 13,
    fontWeight: "700",
  },
  productList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  safeArea: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  saveHint: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
  },
  saveIcon: {
    color: "#64748B",
    fontSize: 20,
    marginRight: 7,
  },
  savePlaceholder: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    flexDirection: "row",
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  savePlaceholderText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
  },
  section: {
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  sectionEyebrow: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 14,
  },
  skeleton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
  },
  skeletonLine: {
    height: 18,
    marginTop: 14,
    width: "72%",
  },
  skeletonMap: {
    height: 220,
    marginTop: 30,
    width: "100%",
  },
  skeletonTitle: {
    height: 34,
    marginTop: 34,
    width: "82%",
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    minWidth: "46%",
    padding: 14,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 7,
  },
  stateShell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statsNote: {
    color: "#64748B",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 19,
    marginTop: 12,
  },
  summary: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 25,
    marginTop: 15,
  },
  title: {
    color: "#0F172A",
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 38,
    marginTop: 8,
  },
  unverifiedBadge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  unverifiedBadgeText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
  },
  verifiedBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  verifiedBadgeText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "800",
  },
});

import {
  deleteFavorite,
  getFavorites,
  type DeleteFavorite200,
  type GetFavorites200DataItem,
} from "@chinasupply/api-client";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { useMobileProtectedApi } from "../../lib/mobile-protected-api";
import {
  FAVORITES_PAGE_SIZE,
  flattenFavoritePages,
  getFavoritesQueryKey,
  getNextFavoritesCursor,
  removeFavoriteFromCache,
  type FavoritesInfiniteData,
} from "./favorites-cache";

type FavoriteTab = "factory" | "cluster";

function SavedState({
  action,
  kind,
  onAction,
}: Readonly<{
  action?: string;
  kind: "error" | "loading" | "signed-out";
  onAction?: () => void;
}>) {
  const { t } = useTranslation();
  const title =
    kind === "signed-out"
      ? t("favorites.signedOut.title")
      : kind === "error"
        ? t("favorites.error.title")
        : t("favorites.loading");
  const description =
    kind === "signed-out"
      ? t("favorites.signedOut.description")
      : kind === "error"
        ? t("favorites.error.description")
        : null;

  return (
    <View
      accessibilityRole={kind === "error" ? "alert" : undefined}
      style={styles.stateCard}
      testID={`saved-${kind}`}
    >
      {kind === "loading" ? (
        <ActivityIndicator color="#0F766E" size="large" />
      ) : null}
      <Text style={styles.stateTitle}>{title}</Text>
      {description === null ? null : (
        <Text style={styles.stateDescription}>{description}</Text>
      )}
      {action === undefined || onAction === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function FavoriteCard({
  favorite,
  mutationPending,
  onRemove,
  onViewDetails,
  removing,
}: Readonly<{
  favorite: GetFavorites200DataItem;
  mutationPending: boolean;
  onRemove: () => void;
  onViewDetails: () => void;
  removing: boolean;
}>) {
  const { t } = useTranslation();
  const typeLabel = t(
    favorite.targetType === "factory"
      ? "favorites.tabs.factories"
      : "favorites.tabs.clusters",
  );

  if (favorite.target === null) {
    return (
      <View style={styles.unavailableCard} testID={`favorite-${favorite.id}`}>
        <Text style={styles.cardType}>{typeLabel}</Text>
        <Text style={styles.cardTitle}>{t("favorites.unavailable.title")}</Text>
        <Text style={styles.cardMeta}>
          {t("favorites.unavailable.description")}
        </Text>
        <Pressable
          accessibilityLabel={t("favorites.removeLabel", {
            name: t("favorites.unavailable.title"),
          })}
          accessibilityRole="button"
          disabled={mutationPending}
          onPress={onRemove}
          style={styles.removeButton}
          testID={`favorite-remove-${favorite.id}`}
        >
          <Text style={styles.removeButtonText}>
            {t(removing ? "favorites.removing" : "favorites.remove")}
          </Text>
        </Pressable>
      </View>
    );
  }

  const target = favorite.target;
  const isFactory = "imageUrl" in target;
  const imageUrl = isFactory ? target.imageUrl : target.coverImageUrl;
  const verification = isFactory
    ? t(
        target.verified
          ? "favorites.verification.verified"
          : "favorites.verification.unverified",
      )
    : null;

  return (
    <View style={styles.card} testID={`favorite-${favorite.id}`}>
      <View style={styles.imageFrame}>
        {imageUrl === null ? (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageLetter}>{target.name.charAt(0)}</Text>
          </View>
        ) : (
          <Image
            accessibilityLabel={t("favorites.imageAlt", {
              name: target.name,
            })}
            accessible
            resizeMode="cover"
            source={{ uri: imageUrl }}
            style={styles.image}
          />
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardType}>{typeLabel}</Text>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {target.name}
        </Text>
        <Text style={styles.cardMeta}>
          {target.region.name}
          {verification === null ? "" : ` · ${verification}`}
        </Text>
        <Text numberOfLines={2} style={styles.cardProducts}>
          {target.mainProducts.join(" · ")}
        </Text>
        <View style={styles.cardActions}>
          <Pressable
            accessibilityLabel={t("favorites.viewDetailsLabel", {
              name: target.name,
            })}
            accessibilityRole="button"
            onPress={onViewDetails}
            style={styles.detailsButton}
            testID={`favorite-details-${favorite.id}`}
          >
            <Text style={styles.detailsButtonText}>
              {t("favorites.viewDetails")} →
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t("favorites.removeLabel", {
              name: target.name,
            })}
            accessibilityRole="button"
            disabled={mutationPending}
            onPress={onRemove}
            style={styles.removeButton}
            testID={`favorite-remove-${favorite.id}`}
          >
            <Text style={styles.removeButtonText}>
              {t(removing ? "favorites.removing" : "favorites.remove")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FavoriteTab>("factory");
  const { getRequest, handleProtectedError, isLoaded, isSignedIn, userId } =
    useMobileProtectedApi();
  const queryKey = useMemo(
    () => getFavoritesQueryKey(userId ?? "signed-out"),
    [userId],
  );
  const query = useInfiniteQuery({
    enabled:
      isLoaded &&
      isSignedIn === true &&
      userId !== null &&
      userId !== undefined,
    getNextPageParam: getNextFavoritesCursor,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) =>
      getFavorites(
        {
          limit: FAVORITES_PAGE_SIZE,
          ...(pageParam === null ? {} : { cursor: pageParam }),
        },
        await getRequest(signal),
      ),
    queryKey,
  });
  const removeMutation = useMutation<
    DeleteFavorite200,
    Error,
    GetFavorites200DataItem,
    FavoritesInfiniteData | undefined
  >({
    mutationFn: async (favorite) =>
      deleteFavorite(
        favorite.targetType,
        favorite.targetId,
        await getRequest(),
      ),
    onError: (error, _favorite, previous) => {
      if (previous !== undefined) queryClient.setQueryData(queryKey, previous);
      void handleProtectedError(error);
    },
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<FavoritesInfiniteData>(queryKey);
      queryClient.setQueryData<FavoritesInfiniteData>(queryKey, (current) =>
        removeFavoriteFromCache(current, favorite.id),
      );
      return previous;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (query.error !== null) void handleProtectedError(query.error);
  }, [handleProtectedError, query.error]);

  useFocusEffect(
    useCallback(() => {
      if (
        isLoaded &&
        isSignedIn === true &&
        userId !== null &&
        userId !== undefined
      ) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }, [isLoaded, isSignedIn, queryClient, queryKey, userId]),
  );

  const favorites =
    query.data === undefined ? [] : flattenFavoritePages(query.data.pages);
  const visibleFavorites = favorites.filter(
    (favorite) => favorite.targetType === tab,
  );

  const openSignIn = () => {
    router.push({
      pathname: "/sign-in",
      params: { returnTo: "/saved" },
    } as unknown as Href);
  };

  const openDetails = (favorite: GetFavorites200DataItem) => {
    if (favorite.target === null) return;
    if (favorite.targetType === "factory") {
      router.push({
        pathname: "/factories/[slug]",
        params: { slug: favorite.target.slug },
      } as unknown as Href);
      return;
    }
    router.push({
      pathname: "/clusters/[slug]",
      params: { slug: favorite.target.slug },
    } as unknown as Href);
  };

  let body;
  if (!isLoaded) {
    body = <SavedState kind="loading" />;
  } else if (!isSignedIn || userId === null || userId === undefined) {
    body = (
      <SavedState
        action={t("favorites.signedOut.action")}
        kind="signed-out"
        onAction={openSignIn}
      />
    );
  } else if (query.isPending) {
    body = <SavedState kind="loading" />;
  } else if (query.isError) {
    body = (
      <SavedState
        action={t("favorites.error.retry")}
        kind="error"
        onAction={() => void query.refetch()}
      />
    );
  } else {
    body = (
      <View style={styles.listShell}>
        <View
          accessibilityLabel={t("favorites.title")}
          accessibilityRole="tablist"
          style={styles.tabs}
        >
          {(["factory", "cluster"] as const).map((targetType) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === targetType }}
              key={targetType}
              onPress={() => setTab(targetType)}
              style={[styles.tab, tab === targetType && styles.tabActive]}
              testID={`favorites-tab-${targetType}`}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === targetType && styles.tabTextActive,
                ]}
              >
                {t(
                  targetType === "factory"
                    ? "favorites.tabs.factories"
                    : "favorites.tabs.clusters",
                )}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {t(
                  query.hasNextPage
                    ? "favorites.moreMayMatch"
                    : "favorites.empty",
                )}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {query.hasNextPage ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={query.isFetchingNextPage}
                  onPress={() => void query.fetchNextPage()}
                  style={styles.loadMoreButton}
                  testID="favorites-load-more"
                >
                  <Text style={styles.loadMoreText}>
                    {t(
                      query.isFetchingNextPage
                        ? "favorites.loadingMore"
                        : query.isFetchNextPageError
                          ? "favorites.error.retry"
                          : "favorites.loadMore",
                    )}
                  </Text>
                </Pressable>
              ) : visibleFavorites.length > 0 ? (
                <Text style={styles.allLoaded}>{t("favorites.allLoaded")}</Text>
              ) : null}
              <Text
                accessibilityLiveRegion={
                  removeMutation.isError ? "assertive" : "polite"
                }
                style={[
                  styles.mutationStatus,
                  removeMutation.isError && styles.mutationError,
                ]}
              >
                {removeMutation.isError
                  ? t("favorites.removeError")
                  : removeMutation.isSuccess
                    ? t("favorites.removed")
                    : ""}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          data={visibleFavorites}
          keyExtractor={(favorite) => favorite.id}
          onRefresh={() => void query.refetch()}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          renderItem={({ item }) => (
            <FavoriteCard
              favorite={item}
              mutationPending={removeMutation.isPending}
              onRemove={() => removeMutation.mutate(item)}
              onViewDetails={() => openDetails(item)}
              removing={
                removeMutation.isPending &&
                removeMutation.variables?.id === item.id
              }
            />
          )}
          showsVerticalScrollIndicator={false}
          testID="favorites-list"
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("favorites.eyebrow")}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {t("favorites.title")}
        </Text>
        <Text style={styles.description}>{t("favorites.description")}</Text>
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  allLoaded: { color: "#64748B", fontSize: 13, textAlign: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  cardContent: { padding: 16 },
  cardMeta: { color: "#64748B", fontSize: 13, lineHeight: 19, marginTop: 5 },
  cardProducts: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  cardType: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  description: { color: "#475569", fontSize: 15, lineHeight: 22, marginTop: 6 },
  detailsButton: { minHeight: 44, paddingVertical: 12 },
  detailsButtonText: { color: "#0F766E", fontSize: 13, fontWeight: "800" },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 52,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  eyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footer: { minHeight: 70, paddingBottom: 28, paddingTop: 8 },
  header: { paddingBottom: 16, paddingHorizontal: 20, paddingTop: 8 },
  image: { height: "100%", width: "100%" },
  imageFrame: { backgroundColor: "#E2E8F0", height: 150 },
  imageLetter: { color: "#0F766E", fontSize: 36, fontWeight: "800" },
  imagePlaceholder: { alignItems: "center", flex: 1, justifyContent: "center" },
  listContent: { paddingBottom: 20, paddingHorizontal: 18 },
  listShell: { flex: 1 },
  loadMoreButton: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "rgba(15, 118, 110, 0.3)",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  loadMoreText: { color: "#0F766E", fontSize: 13, fontWeight: "800" },
  mutationError: { color: "#B91C1C" },
  mutationStatus: {
    color: "#0F766E",
    fontSize: 12,
    marginTop: 10,
    minHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 12,
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  removeButton: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 12 },
  removeButtonText: { color: "#B91C1C", fontSize: 13, fontWeight: "800" },
  safeArea: { backgroundColor: "#F8FAFC", flex: 1 },
  stateCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    margin: 20,
    padding: 26,
  },
  stateDescription: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  stateTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  tab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 3,
    flex: 1,
    minHeight: 46,
    paddingVertical: 12,
  },
  tabActive: { borderBottomColor: "#0F766E" },
  tabText: { color: "#64748B", fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: "#0F766E" },
  tabs: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 18,
  },
  title: { color: "#0F172A", fontSize: 30, fontWeight: "900", marginTop: 4 },
  unavailableCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
});

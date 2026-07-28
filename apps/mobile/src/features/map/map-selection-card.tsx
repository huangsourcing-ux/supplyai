import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { useGetCluster, useGetFactory } from "@chinasupply/api-client";

import type { SelectedMapFeature } from "./map-selection";

export type MapSelectionDetailState =
  | {
      imageUrl: string | null;
      mainProducts: string[];
      status: "ready";
    }
  | {
      status: "error";
    }
  | {
      status: "loading";
    };

export type MapSelectionCardLabels = {
  close: string;
  detailError: string;
  entityType: string;
  factoryCountOrVerification: string;
  loadingDetails: string;
  mainProducts: string;
  retry: string;
  viewDetails: string;
};

export function MapSelectionCardView({
  detail,
  labels,
  onClose,
  onRetry,
  selection,
}: Readonly<{
  detail: MapSelectionDetailState;
  labels: MapSelectionCardLabels;
  onClose: () => void;
  onRetry: () => void;
  selection: SelectedMapFeature;
}>) {
  return (
    <View
      accessibilityLabel={`${labels.entityType}: ${selection.name}`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: detail.status === "loading" }}
      style={styles.card}
      testID="map-selection-card"
    >
      <Pressable
        accessibilityLabel={labels.close}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onClose}
        style={styles.closeButton}
        testID="map-card-close"
      >
        <Text aria-hidden style={styles.closeText}>
          ×
        </Text>
      </Pressable>

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageFrame}>
          {detail.status === "ready" && detail.imageUrl !== null ? (
            <Image
              accessible={false}
              resizeMode="cover"
              source={{ uri: detail.imageUrl }}
              style={styles.image}
              testID="map-card-image"
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                detail.status === "loading" ? styles.skeleton : null,
              ]}
              testID="map-card-image-placeholder"
            />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>{labels.entityType}</Text>
          <Text style={styles.title}>{selection.name}</Text>
          <View
            style={[
              styles.badge,
              selection.kind === "factory"
                ? selection.verified
                  ? styles.factoryBadge
                  : styles.unverifiedBadge
                : styles.clusterBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                selection.kind === "factory"
                  ? selection.verified
                    ? styles.factoryBadgeText
                    : styles.unverifiedBadgeText
                  : styles.clusterBadgeText,
              ]}
            >
              {labels.factoryCountOrVerification}
            </Text>
          </View>

          <View style={styles.products}>
            <Text style={styles.productsTitle}>{labels.mainProducts}</Text>
            {detail.status === "loading" ? (
              <View
                accessibilityLabel={labels.loadingDetails}
                accessibilityRole="progressbar"
                style={styles.productList}
                testID="map-card-detail-skeleton"
              >
                <View style={[styles.productSkeleton, styles.skeletonWide]} />
                <View style={[styles.productSkeleton, styles.skeletonShort]} />
                <View style={[styles.productSkeleton, styles.skeletonWider]} />
              </View>
            ) : detail.status === "error" ? (
              <View
                accessibilityRole="alert"
                style={styles.error}
                testID="map-card-detail-error"
              >
                <Text style={styles.errorText}>{labels.detailError}</Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={onRetry}
                  style={styles.errorRetry}
                >
                  <Text style={styles.errorRetryText}>{labels.retry}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.productList}>
                {detail.mainProducts.map((product, index) => (
                  <View key={`${product}-${index}`} style={styles.productChip}>
                    <Text style={styles.productText}>{product}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.disabledCta}
            testID="map-card-details-cta"
          >
            <Text style={styles.disabledCtaText}>{labels.viewDetails}</Text>
            <Text aria-hidden style={styles.disabledCtaText}>
              →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export function MapSelectionCard({
  onClose,
  selection,
}: Readonly<{
  onClose: () => void;
  selection: SelectedMapFeature;
}>) {
  const { t } = useTranslation();
  const isCluster = selection.kind === "cluster";
  const clusterQuery = useGetCluster(isCluster ? selection.slug : "", {
    query: { enabled: isCluster },
  });
  const factoryQuery = useGetFactory(isCluster ? "" : selection.slug, {
    query: { enabled: !isCluster },
  });
  const activeQuery = isCluster ? clusterQuery : factoryQuery;

  let detail: MapSelectionDetailState;
  if (activeQuery.isError) {
    detail = { status: "error" };
  } else if (activeQuery.data === undefined) {
    detail = { status: "loading" };
  } else if (isCluster) {
    detail = {
      imageUrl: clusterQuery.data?.data.coverImageUrl ?? null,
      mainProducts: clusterQuery.data?.data.mainProducts ?? [],
      status: "ready",
    };
  } else {
    detail = {
      imageUrl: factoryQuery.data?.data.imageUrl ?? null,
      mainProducts: factoryQuery.data?.data.mainProducts ?? [],
      status: "ready",
    };
  }

  const labels: MapSelectionCardLabels = {
    close: t("map.card.close"),
    detailError: t("map.card.detailError"),
    entityType: t(isCluster ? "map.card.cluster" : "map.card.factory"),
    factoryCountOrVerification: isCluster
      ? t("map.card.factoryCount", { count: selection.factoryCount })
      : t(selection.verified ? "map.card.verified" : "map.card.unverified"),
    loadingDetails: t("map.card.loadingDetails"),
    mainProducts: t("map.card.mainProducts"),
    retry: t("map.retry"),
    viewDetails: t(
      isCluster ? "map.card.viewClusterDetails" : "map.card.viewFactoryDetails",
    ),
  };

  return (
    <MapSelectionCardView
      detail={detail}
      labels={labels}
      onClose={onClose}
      onRetry={() => {
        void activeQuery.refetch();
      }}
      selection={selection}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderColor: "rgba(71, 85, 79, 0.18)",
    borderRadius: 16,
    borderWidth: 1,
    bottom: 34,
    elevation: 8,
    left: 8,
    maxHeight: "48%",
    overflow: "hidden",
    position: "absolute",
    right: 8,
    shadowColor: "#37413D",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(71, 85, 79, 0.16)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 44,
    zIndex: 2,
  },
  closeText: {
    color: "#33413B",
    fontSize: 26,
    lineHeight: 28,
  },
  clusterBadge: {
    backgroundColor: "#CCFBF1",
  },
  clusterBadgeText: {
    color: "#115E59",
  },
  content: {
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  disabledCta: {
    alignItems: "center",
    backgroundColor: "#94A3B8",
    borderRadius: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  disabledCtaText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  error: {
    alignItems: "center",
    backgroundColor: "#FFF7F7",
    borderColor: "rgba(185, 28, 28, 0.16)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorRetry: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(127, 29, 29, 0.2)",
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  errorRetryText: {
    color: "#7F1D1D",
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: {
    color: "#7F1D1D",
    flex: 1,
    fontSize: 12,
  },
  eyebrow: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  factoryBadge: {
    backgroundColor: "#DBEAFE",
  },
  factoryBadgeText: {
    color: "#1D4ED8",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  imageFrame: {
    backgroundColor: "#E4EBE7",
    height: 128,
    overflow: "hidden",
  },
  imagePlaceholder: {
    backgroundColor: "#E7EEEA",
    height: "100%",
    width: "100%",
  },
  productChip: {
    backgroundColor: "#F0FDFA",
    borderColor: "rgba(15, 118, 110, 0.14)",
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  productList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  productSkeleton: {
    backgroundColor: "#DCE5E0",
    borderRadius: 9,
    height: 28,
  },
  productText: {
    color: "#33413B",
    fontSize: 12,
  },
  products: {
    marginTop: 16,
  },
  productsTitle: {
    color: "#52625B",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  skeleton: {
    opacity: 0.62,
  },
  skeletonShort: {
    width: 64,
  },
  skeletonWide: {
    width: 88,
  },
  skeletonWider: {
    width: 100,
  },
  title: {
    color: "#16241F",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 27,
    marginTop: 5,
    paddingRight: 36,
  },
  unverifiedBadge: {
    backgroundColor: "#E2E8F0",
  },
  unverifiedBadgeText: {
    color: "#475569",
  },
});

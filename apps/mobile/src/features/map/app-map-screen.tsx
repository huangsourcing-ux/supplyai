import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type CameraRef,
  type GeoJSONSourceRef,
  type PressEventWithFeatures,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { analytics } from "@chinasupply/analytics";
import {
  getGetMapClusterBoundariesQueryKey,
  getGetMapClusterPointsQueryKey,
  getGetMapFactoriesQueryKey,
  useGetMapClusterBoundaries,
  useGetMapClusterPoints,
  useGetMapFactories,
} from "@chinasupply/api-client";

import { createMobileMapStyle } from "../../lib/mobile-map-style";
import {
  CHINA_BOUNDS,
  CLUSTER_BOUNDARIES_SOURCE_ID,
  CLUSTER_POINTS_SOURCE_ID,
  EMPTY_CLUSTER_BOUNDARIES,
  EMPTY_CLUSTER_POINTS,
  EMPTY_FACTORY_POINTS,
  FACTORIES_SOURCE_ID,
  clusterBoundariesFillLayer,
  clusterBoundariesLineLayer,
  clusterPointsLayer,
  factoryClusterCountLayer,
  factoryClustersLayer,
  factoryPointsLayer,
  factorySourceOptions,
} from "./map-config";
import {
  resolveMapPressTarget,
  type SelectedMapFeature,
} from "./map-selection";
import { MapSelectionCard } from "./map-selection-card";
import { MapSearch, type MapSearchRef } from "./map-search";
import {
  addMapCategoryParam,
  createDebouncedCategoryFilterUpdater,
  createMapCategoryParams,
  resolveMapSearchAction,
  type MapCategory,
  type MapSearchChoice,
} from "./map-search-model";
import {
  CLUSTER_BOUNDARY_MIN_ZOOM,
  FACTORY_POINT_MIN_ZOOM,
  createDebouncedViewportUpdater,
  readMapViewport,
  type DebouncedViewportUpdater,
  type MapViewport,
} from "./map-viewport";

type MapLoadState = "error" | "loading" | "ready";
type MapStatusKind = "data-error" | "loading" | "map-error";

const DISABLED_BOUNDARY_PARAMS = {
  bbox: "0,0,1,1",
  zoom: 0,
};
const DISABLED_FACTORY_PARAMS = {
  bbox: "0,0,1,1",
};

export default function AppMapScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraRef>(null);
  const factorySourceRef = useRef<GeoJSONSourceRef>(null);
  const hasInitialViewportRef = useRef(false);
  const movementPendingRef = useRef(false);
  const appliedCategorySlugRef = useRef<string | null>(null);
  const searchRef = useRef<MapSearchRef>(null);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedMapFeature | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MapCategory | null>(
    null,
  );
  const [appliedCategory, setAppliedCategory] = useState<MapCategory | null>(
    null,
  );
  const [categoryIsSettling, setCategoryIsSettling] = useState(false);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [viewportIsSettling, setViewportIsSettling] = useState(true);
  const viewportUpdaterRef = useRef<DebouncedViewportUpdater | null>(null);

  if (viewportUpdaterRef.current === null) {
    viewportUpdaterRef.current = createDebouncedViewportUpdater(
      (nextViewport) => {
        const shouldTrackMovement =
          hasInitialViewportRef.current && movementPendingRef.current;
        hasInitialViewportRef.current = true;
        movementPendingRef.current = false;
        setViewport(nextViewport);
        setViewportIsSettling(false);
        if (shouldTrackMovement) {
          analytics.trackMapMoved({
            bbox: nextViewport.bbox,
            categorySlug: appliedCategorySlugRef.current,
            zoom: nextViewport.zoom,
          });
        }
      },
    );
  }

  const mapStyle = useMemo(() => {
    try {
      return createMobileMapStyle();
    } catch {
      return null;
    }
  }, [mapAttempt]);

  const boundariesEnabled =
    !categoryIsSettling &&
    !viewportIsSettling &&
    viewport !== null &&
    viewport.zoom >= CLUSTER_BOUNDARY_MIN_ZOOM;
  const factoriesEnabled =
    !categoryIsSettling &&
    !viewportIsSettling &&
    viewport !== null &&
    viewport.zoom >= FACTORY_POINT_MIN_ZOOM;
  const categorySlug = appliedCategory?.slug;

  const clusterPointsQuery = useGetMapClusterPoints(
    createMapCategoryParams(categorySlug),
    {
      query: {
        enabled: !categoryIsSettling,
      },
    },
  );
  const clusterBoundariesQuery = useGetMapClusterBoundaries(
    addMapCategoryParam(viewport ?? DISABLED_BOUNDARY_PARAMS, categorySlug),
    {
      query: {
        enabled: boundariesEnabled,
        placeholderData: (previousData, previousQuery) => {
          const previousParams = previousQuery?.queryKey[1];
          const previousCategory =
            typeof previousParams === "object" &&
            previousParams !== null &&
            "category" in previousParams &&
            typeof previousParams.category === "string"
              ? previousParams.category
              : undefined;

          return previousCategory === categorySlug
            ? keepPreviousData(previousData)
            : undefined;
        },
      },
    },
  );
  const factoryPointsQuery = useGetMapFactories(
    addMapCategoryParam(
      viewport === null ? DISABLED_FACTORY_PARAMS : { bbox: viewport.bbox },
      categorySlug,
    ),
    {
      query: {
        enabled: factoriesEnabled,
        placeholderData: (previousData, previousQuery) => {
          const previousParams = previousQuery?.queryKey[1];
          const previousCategory =
            typeof previousParams === "object" &&
            previousParams !== null &&
            "category" in previousParams &&
            typeof previousParams.category === "string"
              ? previousParams.category
              : undefined;

          return previousCategory === categorySlug
            ? keepPreviousData(previousData)
            : undefined;
        },
      },
    },
  );

  const clusterPoints = categoryIsSettling
    ? EMPTY_CLUSTER_POINTS
    : (clusterPointsQuery.data?.data ?? EMPTY_CLUSTER_POINTS);
  const clusterBoundaries = boundariesEnabled
    ? (clusterBoundariesQuery.data?.data ?? EMPTY_CLUSTER_BOUNDARIES)
    : EMPTY_CLUSTER_BOUNDARIES;
  const factoryPoints = factoriesEnabled
    ? (factoryPointsQuery.data?.data ?? EMPTY_FACTORY_POINTS)
    : EMPTY_FACTORY_POINTS;

  useEffect(() => {
    const updater = viewportUpdaterRef.current;
    return () => updater?.cancel();
  }, []);

  useEffect(() => {
    if (!categoryIsSettling) return;

    const updater = createDebouncedCategoryFilterUpdater((category) => {
      setAppliedCategory(category);
      setCategoryIsSettling(false);
    });
    updater.schedule(selectedCategory);

    return () => updater.cancel();
  }, [categoryIsSettling, selectedCategory]);

  useEffect(() => {
    appliedCategorySlugRef.current = categorySlug ?? null;
  }, [categorySlug]);

  const cancelViewportQueries = useCallback(() => {
    void Promise.all([
      queryClient.cancelQueries({
        queryKey: getGetMapClusterBoundariesQueryKey(),
      }),
      queryClient.cancelQueries({
        queryKey: getGetMapFactoriesQueryKey(),
      }),
    ]);
  }, [queryClient]);

  const cancelMapDataQueries = useCallback(() => {
    void Promise.all([
      queryClient.cancelQueries({
        queryKey: getGetMapClusterPointsQueryKey(),
      }),
      queryClient.cancelQueries({
        queryKey: getGetMapClusterBoundariesQueryKey(),
      }),
      queryClient.cancelQueries({
        queryKey: getGetMapFactoriesQueryKey(),
      }),
    ]);
  }, [queryClient]);

  const handleRegionWillChange = useCallback(() => {
    viewportUpdaterRef.current?.cancel();
    movementPendingRef.current = hasInitialViewportRef.current;
    setViewportIsSettling(true);
    cancelViewportQueries();
  }, [cancelViewportQueries]);

  const handleRegionDidChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const nextViewport = readMapViewport(event.nativeEvent);
      if (nextViewport === null) {
        viewportUpdaterRef.current?.cancel();
        movementPendingRef.current = false;
        setViewport(null);
        setViewportIsSettling(false);
        return;
      }

      viewportUpdaterRef.current?.schedule(nextViewport);
    },
    [],
  );

  const retry = () => {
    if (mapLoadState === "error" || mapStyle === null) {
      hasInitialViewportRef.current = false;
      movementPendingRef.current = false;
      setMapLoadState("loading");
      setMapAttempt((attempt) => attempt + 1);
    }

    void clusterPointsQuery.refetch();
    if (boundariesEnabled) void clusterBoundariesQuery.refetch();
    if (factoriesEnabled) void factoryPointsQuery.refetch();
  };

  const hasDataError =
    clusterPointsQuery.isError ||
    (boundariesEnabled && clusterBoundariesQuery.isError) ||
    (factoriesEnabled && factoryPointsQuery.isError);
  const hasPendingData =
    categoryIsSettling ||
    clusterPointsQuery.isPending ||
    (boundariesEnabled && clusterBoundariesQuery.isPending) ||
    (factoriesEnabled && factoryPointsQuery.isPending);

  let statusKind: MapStatusKind | null = null;
  if (mapStyle === null || mapLoadState === "error") {
    statusKind = "map-error";
  } else if (hasDataError) {
    statusKind = "data-error";
  } else if (mapLoadState === "loading" || hasPendingData) {
    statusKind = "loading";
  }

  const handleFeaturePress = useCallback(
    (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      event.stopPropagation();
      searchRef.current?.dismiss();
      const target = resolveMapPressTarget(event.nativeEvent.features);

      if (target.kind === "selection") {
        setSelectedFeature(target.selection);
        return;
      }

      setSelectedFeature(null);
      if (target.kind === "empty") return;

      void factorySourceRef.current
        ?.getClusterExpansionZoom(target.clusterId)
        .then((zoom) => {
          if (!Number.isFinite(zoom)) return;
          cameraRef.current?.easeTo({
            center: target.coordinates,
            duration: 500,
            zoom: Math.min(24, Math.max(0, zoom)),
          });
        })
        .catch(() => undefined);
    },
    [],
  );

  const chooseCategory = (category: MapCategory | null, resetView = true) => {
    if (
      selectedCategory?.slug === category?.slug &&
      selectedCategory?.name === category?.name
    ) {
      return;
    }

    cancelMapDataQueries();
    setSelectedCategory(category);
    setSelectedFeature(null);
    setCategoryIsSettling(true);
    if (resetView) {
      cameraRef.current?.fitBounds([...CHINA_BOUNDS], {
        duration: 700,
        padding: { bottom: 48, left: 24, right: 24, top: 48 },
      });
    }
  };

  const chooseSearchResult = (choice: MapSearchChoice) => {
    const action = resolveMapSearchAction(choice);

    if (action.kind === "category") {
      chooseCategory(action.category);
      return;
    }

    if (selectedCategory !== null) chooseCategory(null, false);
    setSelectedFeature(action.selection);
    cameraRef.current?.flyTo({
      center: action.center,
      duration: 700,
      zoom: action.zoom,
    });
  };

  const factoriesAreTruncated =
    factoriesEnabled &&
    !factoryPointsQuery.isPlaceholderData &&
    factoryPointsQuery.data?.meta.truncated === true;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View
        accessibilityState={{ busy: statusKind === "loading" }}
        style={styles.mapFrame}
        testID={statusKind === null ? "app-map-ready" : "app-map-pending"}
      >
        {mapStyle === null ? null : (
          <Map
            accessibilityLabel={t("map.ariaLabel")}
            attribution={false}
            compass
            compassPosition={{ right: 12, top: 122 }}
            key={mapAttempt}
            logo={false}
            mapStyle={mapStyle}
            onDidFailLoadingMap={() => setMapLoadState("error")}
            onDidFinishLoadingMap={() => setMapLoadState("ready")}
            onPress={() => {
              searchRef.current?.dismiss();
              setSelectedFeature(null);
            }}
            onRegionDidChange={handleRegionDidChange}
            onRegionWillChange={handleRegionWillChange}
            scaleBar={false}
            style={styles.map}
            testID="app-map"
            touchPitch={false}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{
                bounds: [...CHINA_BOUNDS],
                padding: { bottom: 48, left: 24, right: 24, top: 48 },
                pitch: 0,
              }}
            />

            <GeoJSONSource
              data={clusterBoundaries}
              id={CLUSTER_BOUNDARIES_SOURCE_ID}
              onPress={handleFeaturePress}
            >
              <Layer {...clusterBoundariesFillLayer} />
              <Layer {...clusterBoundariesLineLayer} />
            </GeoJSONSource>

            <GeoJSONSource
              data={clusterPoints}
              id={CLUSTER_POINTS_SOURCE_ID}
              onPress={handleFeaturePress}
            >
              <Layer {...clusterPointsLayer} />
            </GeoJSONSource>

            <GeoJSONSource
              data={factoryPoints}
              id={FACTORIES_SOURCE_ID}
              onPress={handleFeaturePress}
              ref={factorySourceRef}
              {...factorySourceOptions}
            >
              <Layer {...factoryClustersLayer} />
              <Layer {...factoryClusterCountLayer} />
              <Layer {...factoryPointsLayer} />
            </GeoJSONSource>
          </Map>
        )}

        <View style={styles.searchControls}>
          <MapSearch
            activeCategory={selectedCategory}
            onChoose={chooseSearchResult}
            onChooseCategory={chooseCategory}
            ref={searchRef}
          />
        </View>

        {statusKind === null ? null : (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.status,
              statusKind === "loading"
                ? styles.statusNeutral
                : styles.statusError,
            ]}
            testID="map-status"
          >
            {statusKind === "loading" ? (
              <ActivityIndicator color="#0F766E" size="small" />
            ) : null}
            <Text style={styles.statusText}>
              {t(`map.status.${statusKind}`)}
            </Text>
            {statusKind === "loading" ? null : (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={retry}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>{t("map.retry")}</Text>
              </Pressable>
            )}
          </View>
        )}

        {factoriesAreTruncated ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.truncationNotice,
              selectedFeature === null
                ? styles.truncationNoticeBottom
                : styles.truncationNoticeTop,
            ]}
            testID="map-truncation-notice"
          >
            <Text style={styles.truncationText}>{t("map.truncated")}</Text>
          </View>
        ) : null}

        {selectedFeature === null ? null : (
          <MapSelectionCard
            onClose={() => setSelectedFeature(null)}
            selection={selectedFeature}
          />
        )}

        <View pointerEvents="none" style={styles.attributionContainer}>
          <Text style={styles.attribution}>{t("map.attribution")}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  attribution: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "600",
  },
  attributionContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopRightRadius: 6,
    bottom: 0,
    left: 0,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: "absolute",
  },
  map: {
    flex: 1,
  },
  mapFrame: {
    flex: 1,
    overflow: "hidden",
  },
  retryButton: {
    marginLeft: 10,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  retryText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  searchControls: {
    left: 14,
    position: "absolute",
    right: 14,
    top: 14,
    zIndex: 10,
  },
  status: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    left: 14,
    maxWidth: "72%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: "absolute",
    top: 122,
  },
  statusError: {
    backgroundColor: "rgba(254, 226, 226, 0.96)",
  },
  statusNeutral: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  statusText: {
    color: "#0F172A",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  truncationNotice: {
    backgroundColor: "rgba(255, 247, 237, 0.96)",
    borderColor: "rgba(194, 65, 12, 0.22)",
    borderRadius: 999,
    borderWidth: 1,
    left: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: "absolute",
    right: 14,
  },
  truncationNoticeBottom: {
    bottom: 34,
  },
  truncationNoticeTop: {
    top: 122,
  },
  truncationText: {
    color: "#7C2D12",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});

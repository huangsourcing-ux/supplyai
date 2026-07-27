import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
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

import {
  getGetMapClusterBoundariesQueryKey,
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
  factoryPointsLayer,
} from "./map-config";
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
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [viewportIsSettling, setViewportIsSettling] = useState(true);
  const viewportUpdaterRef = useRef<DebouncedViewportUpdater | null>(null);

  if (viewportUpdaterRef.current === null) {
    viewportUpdaterRef.current = createDebouncedViewportUpdater(
      (nextViewport) => {
        setViewport(nextViewport);
        setViewportIsSettling(false);
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
    !viewportIsSettling &&
    viewport !== null &&
    viewport.zoom >= CLUSTER_BOUNDARY_MIN_ZOOM;
  const factoriesEnabled =
    !viewportIsSettling &&
    viewport !== null &&
    viewport.zoom >= FACTORY_POINT_MIN_ZOOM;

  const clusterPointsQuery = useGetMapClusterPoints();
  const clusterBoundariesQuery = useGetMapClusterBoundaries(
    viewport ?? DISABLED_BOUNDARY_PARAMS,
    {
      query: {
        enabled: boundariesEnabled,
        placeholderData: keepPreviousData,
      },
    },
  );
  const factoryPointsQuery = useGetMapFactories(
    viewport === null ? DISABLED_FACTORY_PARAMS : { bbox: viewport.bbox },
    {
      query: {
        enabled: factoriesEnabled,
        placeholderData: keepPreviousData,
      },
    },
  );

  const clusterPoints = clusterPointsQuery.data?.data ?? EMPTY_CLUSTER_POINTS;
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

  const handleRegionWillChange = useCallback(() => {
    viewportUpdaterRef.current?.cancel();
    setViewportIsSettling(true);
    cancelViewportQueries();
  }, [cancelViewportQueries]);

  const handleRegionDidChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const nextViewport = readMapViewport(event.nativeEvent);
      if (nextViewport === null) {
        viewportUpdaterRef.current?.cancel();
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.mapFrame}>
        {mapStyle === null ? null : (
          <Map
            accessibilityLabel={t("map.ariaLabel")}
            attribution={false}
            compass
            compassPosition={{ right: 12, top: 12 }}
            key={mapAttempt}
            logo={false}
            mapStyle={mapStyle}
            onDidFailLoadingMap={() => setMapLoadState("error")}
            onDidFinishLoadingMap={() => setMapLoadState("ready")}
            onRegionDidChange={handleRegionDidChange}
            onRegionWillChange={handleRegionWillChange}
            scaleBar={false}
            style={styles.map}
            testID="app-map"
            touchPitch={false}
          >
            <Camera
              initialViewState={{
                bounds: [...CHINA_BOUNDS],
                padding: { bottom: 48, left: 24, right: 24, top: 48 },
                pitch: 0,
              }}
            />

            <GeoJSONSource
              data={clusterBoundaries}
              id={CLUSTER_BOUNDARIES_SOURCE_ID}
            >
              <Layer {...clusterBoundariesFillLayer} />
              <Layer {...clusterBoundariesLineLayer} />
            </GeoJSONSource>

            <GeoJSONSource data={clusterPoints} id={CLUSTER_POINTS_SOURCE_ID}>
              <Layer {...clusterPointsLayer} />
            </GeoJSONSource>

            <GeoJSONSource data={factoryPoints} id={FACTORIES_SOURCE_ID}>
              <Layer {...factoryPointsLayer} />
            </GeoJSONSource>
          </Map>
        )}

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
  status: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    left: 14,
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: "absolute",
    top: 14,
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
});

import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type InitialViewState,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import type {
  GetCluster200DataBoundary,
  GetCluster200DataCentroid,
} from "@chinasupply/api-client";
import { BASEMAP_LABEL_ANCHOR_LAYER_ID } from "@chinasupply/config/map/style";

import { createMobileMapStyle } from "../../lib/mobile-map-style";
import { getClusterBoundaryBounds } from "./cluster-detail-model";

export const DETAIL_BOUNDARY_SOURCE_ID = "cluster-detail-boundary";
export const DETAIL_BOUNDARY_FILL_LAYER_ID = "cluster-detail-boundary-fill";
export const DETAIL_BOUNDARY_LINE_LAYER_ID = "cluster-detail-boundary-line";
export const DETAIL_CENTROID_SOURCE_ID = "cluster-detail-centroid";
export const DETAIL_CENTROID_LAYER_ID = "cluster-detail-centroid-point";

function createInitialViewState(
  boundary: GetCluster200DataBoundary,
  centroid: GetCluster200DataCentroid,
): InitialViewState {
  const bounds = getClusterBoundaryBounds(boundary);
  if (bounds === null) {
    return {
      center: centroid.coordinates,
      pitch: 0,
      zoom: 10,
    };
  }

  return {
    bounds: [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]],
    padding: { bottom: 36, left: 28, right: 28, top: 36 },
    pitch: 0,
  };
}

export function ClusterBoundaryMap({
  boundary,
  centroid,
  color,
  name,
}: Readonly<{
  boundary: GetCluster200DataBoundary;
  centroid: GetCluster200DataCentroid;
  color: string;
  name: string;
}>) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [mapState, setMapState] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const mapStyle = useMemo(() => {
    try {
      return createMobileMapStyle();
    } catch {
      return null;
    }
  }, [attempt]);
  const visibleState = mapStyle === null ? "error" : mapState;
  const initialViewState = useMemo(
    () => createInitialViewState(boundary, centroid),
    [boundary, centroid],
  );
  const boundaryData: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null =
    boundary === null
      ? null
      : {
          features: [
            {
              geometry: boundary,
              properties: { color },
              type: "Feature",
            },
          ],
          type: "FeatureCollection",
        };
  const centroidData: GeoJSON.Feature<GeoJSON.Point> = {
    geometry: centroid,
    properties: { color },
    type: "Feature",
  };

  useEffect(() => {
    setMapState("loading");
  }, [name]);

  return (
    <View
      accessibilityLabel={t("clusterDetail.map.ariaLabel", { name })}
      style={styles.frame}
      testID="cluster-detail-map"
    >
      {mapStyle === null ? null : (
        <Map
          accessibilityLabel={t("clusterDetail.map.ariaLabel", { name })}
          attribution={false}
          compass={false}
          doubleTapHoldZoom={false}
          doubleTapZoom={false}
          dragPan={false}
          key={`${name}:${attempt}`}
          logo={false}
          mapStyle={mapStyle}
          onDidFailLoadingMap={() => setMapState("error")}
          onDidFinishLoadingMap={() => setMapState("ready")}
          scaleBar={false}
          style={styles.map}
          testID="cluster-detail-map-canvas"
          touchPitch={false}
          touchRotate={false}
          touchZoom={false}
        >
          <Camera initialViewState={initialViewState} />

          {boundaryData === null ? null : (
            <GeoJSONSource data={boundaryData} id={DETAIL_BOUNDARY_SOURCE_ID}>
              <Layer
                beforeId={BASEMAP_LABEL_ANCHOR_LAYER_ID}
                id={DETAIL_BOUNDARY_FILL_LAYER_ID}
                paint={{
                  "fill-color": ["get", "color"],
                  "fill-opacity": 0.3,
                }}
                type="fill"
              />
              <Layer
                id={DETAIL_BOUNDARY_LINE_LAYER_ID}
                paint={{
                  "line-color": ["get", "color"],
                  "line-opacity": 0.92,
                  "line-width": 2.5,
                }}
                type="line"
              />
            </GeoJSONSource>
          )}

          <GeoJSONSource data={centroidData} id={DETAIL_CENTROID_SOURCE_ID}>
            <Layer
              id={DETAIL_CENTROID_LAYER_ID}
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": boundary === null ? 7 : 5,
                "circle-stroke-color": "#FFFFFF",
                "circle-stroke-width": 2.5,
              }}
              type="circle"
            />
          </GeoJSONSource>
        </Map>
      )}

      {boundary === null ? (
        <View style={styles.boundaryNotice}>
          <Text style={styles.boundaryNoticeText}>
            {t("clusterDetail.map.boundaryUnavailable")}
          </Text>
        </View>
      ) : null}

      {visibleState === "ready" ? null : (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole={visibleState === "error" ? "alert" : undefined}
          style={styles.status}
          testID="cluster-detail-map-status"
        >
          {visibleState === "loading" ? (
            <ActivityIndicator color="#0F766E" size="small" />
          ) : null}
          <Text style={styles.statusText}>
            {t(
              visibleState === "loading"
                ? "clusterDetail.map.loading"
                : "clusterDetail.map.error",
            )}
          </Text>
          {visibleState === "error" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMapState("loading");
                setAttempt((value) => value + 1);
              }}
              style={styles.retry}
            >
              <Text style={styles.retryText}>
                {t("clusterDetail.map.retry")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View pointerEvents="none" style={styles.attributionContainer}>
        <Text style={styles.attribution}>
          {t("clusterDetail.map.attribution")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  attribution: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "600",
  },
  attributionContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderTopRightRadius: 6,
    bottom: 0,
    left: 0,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: "absolute",
  },
  boundaryNotice: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 8,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
    right: 12,
    top: 12,
  },
  boundaryNoticeText: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  frame: {
    backgroundColor: "#E2E8F0",
    borderColor: "rgba(15, 118, 110, 0.14)",
    borderRadius: 16,
    borderWidth: 1,
    height: 240,
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  retry: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  retryText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
  },
  status: {
    alignItems: "center",
    backgroundColor: "rgba(248, 250, 252, 0.96)",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "center",
    left: 0,
    padding: 16,
    position: "absolute",
    right: 0,
    top: 0,
  },
  statusText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
});

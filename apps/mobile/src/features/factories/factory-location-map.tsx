import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
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

import type { GetFactory200DataLocation } from "@chinasupply/api-client";

import { createMobileMapStyle } from "../../lib/mobile-map-style";

export const FACTORY_DETAIL_LOCATION_SOURCE_ID = "factory-detail-location";
export const FACTORY_DETAIL_LOCATION_LAYER_ID = "factory-detail-location-point";

export function FactoryLocationMap({
  location,
  name,
  verified,
}: Readonly<{
  location: GetFactory200DataLocation;
  name: string;
  verified: boolean;
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
  const factoryPoint: GeoJSON.Feature<GeoJSON.Point> = {
    geometry: location,
    properties: { verified },
    type: "Feature",
  };

  useEffect(() => {
    setMapState("loading");
  }, [name]);

  return (
    <View
      accessibilityLabel={t("factoryDetail.map.ariaLabel", { name })}
      accessibilityValue={{ text: location.coordinates.join(",") }}
      style={styles.frame}
      testID="factory-detail-map"
    >
      {mapStyle === null ? null : (
        <Map
          accessibilityLabel={t("factoryDetail.map.ariaLabel", { name })}
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
          testID="factory-detail-map-canvas"
          touchPitch={false}
          touchRotate={false}
          touchZoom={false}
        >
          <Camera
            initialViewState={{
              center: location.coordinates,
              pitch: 0,
              zoom: 14,
            }}
          />
          <GeoJSONSource
            data={factoryPoint}
            id={FACTORY_DETAIL_LOCATION_SOURCE_ID}
          >
            <Layer
              id={FACTORY_DETAIL_LOCATION_LAYER_ID}
              paint={{
                "circle-color": verified ? "#2563EB" : "#64748B",
                "circle-radius": 8,
                "circle-stroke-color": "#FFFFFF",
                "circle-stroke-width": 3,
              }}
              type="circle"
            />
          </GeoJSONSource>
        </Map>
      )}

      {visibleState === "ready" ? null : (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole={visibleState === "error" ? "alert" : undefined}
          style={styles.status}
          testID="factory-detail-map-status"
        >
          {visibleState === "loading" ? (
            <ActivityIndicator color="#2563EB" size="small" />
          ) : null}
          <Text style={styles.statusText}>
            {t(
              visibleState === "loading"
                ? "factoryDetail.map.loading"
                : "factoryDetail.map.error",
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
                {t("factoryDetail.map.retry")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View pointerEvents="none" style={styles.attributionContainer}>
        <Text style={styles.attribution}>
          {t("factoryDetail.map.attribution")}
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
  frame: {
    backgroundColor: "#E2E8F0",
    borderColor: "rgba(37, 99, 235, 0.15)",
    borderRadius: 16,
    borderWidth: 1,
    height: 240,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  retry: {
    borderColor: "rgba(37, 99, 235, 0.3)",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  retryText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  status: {
    alignItems: "center",
    backgroundColor: "rgba(248, 250, 252, 0.96)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  statusText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});

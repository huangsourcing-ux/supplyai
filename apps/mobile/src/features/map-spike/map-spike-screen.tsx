import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
} from "@maplibre/maplibre-react-native";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { StatusBar } from "expo-status-bar";
import { useReducer } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  clusteredPoints,
  referencePoint,
  validationPolygon,
  YIWU_CENTER,
} from "./fixtures";
import {
  clusterLayer,
  polygonLayer,
  referencePointLayer,
  unclusteredPointLayer,
} from "./layers";
import { reduceMapLoadState } from "./load-state";
import spikeStyle from "./spike-style.json";

const offlineMapStyle = spikeStyle as StyleSpecification;

export default function MapSpikeScreen() {
  const { t } = useTranslation();
  const [loadState, dispatchLoadEvent] = useReducer(
    reduceMapLoadState,
    "loading",
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("mapSpike.eyebrow")}</Text>
        <Text style={styles.title}>{t("mapSpike.title")}</Text>
      </View>

      <View style={styles.mapFrame}>
        <Map
          attribution={false}
          compass={false}
          logo={false}
          mapStyle={offlineMapStyle}
          onDidFailLoadingMap={() => dispatchLoadEvent("failed")}
          onDidFinishRenderingMapFully={() => dispatchLoadEvent("finished")}
          scaleBar={false}
          style={styles.map}
          testID="map-spike-map"
        >
          <Camera center={YIWU_CENTER} zoom={11.25} />

          <GeoJSONSource data={validationPolygon} id="validation-area-source">
            <Layer {...polygonLayer} />
          </GeoJSONSource>

          <GeoJSONSource
            cluster
            clusterMaxZoom={14}
            clusterMinPoints={2}
            clusterRadius={64}
            data={clusteredPoints}
            id="cluster-source"
          >
            <Layer {...clusterLayer} />
            <Layer {...unclusteredPointLayer} />
          </GeoJSONSource>

          <GeoJSONSource data={referencePoint} id="reference-point-source">
            <Layer {...referencePointLayer} />
          </GeoJSONSource>
        </Map>

        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.status,
            loadState === "error" ? styles.statusError : styles.statusNeutral,
          ]}
          testID="map-load-status"
        >
          <View
            style={[
              styles.statusDot,
              loadState === "ready" && styles.statusDotReady,
              loadState === "error" && styles.statusDotError,
            ]}
          />
          <Text style={styles.statusText}>
            {t(`mapSpike.status.${loadState}`)}
          </Text>
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>{t("mapSpike.legend.title")}</Text>
          <LegendRow color="#2563EB" label={t("mapSpike.legend.point")} />
          <LegendRow color="#0F766E" label={t("mapSpike.legend.polygon")} />
          <LegendRow color="#F97316" label={t("mapSpike.legend.cluster")} />
        </View>
      </View>

      <Text style={styles.attribution}>{t("mapSpike.attribution")}</Text>
    </SafeAreaView>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  attribution: {
    color: "#475569",
    fontSize: 11,
    paddingHorizontal: 20,
    paddingVertical: 10,
    textAlign: "center",
  },
  eyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  legend: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 14,
    bottom: 14,
    left: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    position: "absolute",
    shadowColor: "#0F172A",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  legendLabel: {
    color: "#334155",
    fontSize: 12,
    marginLeft: 8,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 7,
  },
  legendSwatch: {
    borderColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  legendTitle: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
  map: {
    flex: 1,
  },
  mapFrame: {
    borderColor: "#CBD5E1",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 14,
    overflow: "hidden",
  },
  safeArea: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  status: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: "absolute",
    right: 14,
    top: 14,
  },
  statusDot: {
    backgroundColor: "#F59E0B",
    borderRadius: 4,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  statusDotError: {
    backgroundColor: "#DC2626",
  },
  statusDotReady: {
    backgroundColor: "#16A34A",
  },
  statusError: {
    backgroundColor: "rgba(254, 226, 226, 0.96)",
  },
  statusNeutral: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  statusText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
});

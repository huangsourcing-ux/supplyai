"use client";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import {
  type GetMapClusterPoints200Data,
  useGetMapClusterPoints,
} from "@chinasupply/api-client";
import { createChinaSupplyMapStyle } from "@chinasupply/config/map/style";

import {
  CHINA_BOUNDS,
  CLUSTER_POINTS_SOURCE_ID,
  clusterPointsLayer,
  EMPTY_CLUSTER_POINTS,
  MAPLIBRE_WORKER_URL,
} from "./map-config";
import { MapAttribution, type MapAttributionLabels } from "./map-attribution";
import {
  MapStatus,
  type MapStatusKind,
  type MapStatusLabels,
} from "./map-status";

export interface IndustrialMapLabels
  extends MapAttributionLabels, MapStatusLabels {
  ariaLabel: string;
}

type MapLoadState = "error" | "loading" | "ready";

export function IndustrialMap({
  labels,
}: Readonly<{ labels: IndustrialMapLabels }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapDataRef = useRef<GetMapClusterPoints200Data>(EMPTY_CLUSTER_POINTS);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");
  const clusterPointsQuery = useGetMapClusterPoints();
  const clusterPoints = clusterPointsQuery.data?.data ?? EMPTY_CLUSTER_POINTS;

  useEffect(() => {
    mapDataRef.current = clusterPoints;
    const source = mapRef.current?.getSource(
      CLUSTER_POINTS_SOURCE_ID,
    ) as GeoJSONSource | null;
    source?.setData(clusterPoints);
  }, [clusterPoints]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    let disposed = false;
    let activeMap: MapLibreMap | null = null;

    setMapLoadState("loading");

    void import("maplibre-gl")
      .then(({ Map, NavigationControl, setWorkerUrl }) => {
        if (disposed) return;

        setWorkerUrl(MAPLIBRE_WORKER_URL);
        const style = createChinaSupplyMapStyle(
          process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "",
        ) as unknown as StyleSpecification;
        const map = new Map({
          attributionControl: false,
          bounds: CHINA_BOUNDS,
          container,
          fitBoundsOptions: {
            animate: false,
            padding: { bottom: 48, left: 24, right: 24, top: 48 },
          },
          style,
        });

        activeMap = map;
        mapRef.current = map;
        map.addControl(
          new NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: false,
          }),
          "top-right",
        );

        let initialLoadComplete = false;
        const handleInitialError = () => {
          if (!initialLoadComplete && !disposed) {
            setMapLoadState("error");
          }
        };
        const handleStyleLoad = () => {
          if (disposed) return;

          initialLoadComplete = true;
          map.off("error", handleInitialError);
          map.addSource(CLUSTER_POINTS_SOURCE_ID, {
            data: mapDataRef.current,
            type: "geojson",
          });
          map.addLayer(clusterPointsLayer);
          setMapLoadState("ready");
        };

        map.on("error", handleInitialError);
        map.once("style.load", handleStyleLoad);
      })
      .catch(() => {
        if (!disposed) setMapLoadState("error");
      });

    return () => {
      disposed = true;
      if (mapRef.current === activeMap) mapRef.current = null;
      activeMap?.remove();
    };
  }, [mapAttempt]);

  const retry = () => {
    void clusterPointsQuery.refetch();
    setMapAttempt((attempt) => attempt + 1);
  };

  let statusKind: MapStatusKind | null = null;
  if (mapLoadState === "error") {
    statusKind = "map-error";
  } else if (clusterPointsQuery.isError) {
    statusKind = "data-error";
  } else if (mapLoadState === "loading" || clusterPointsQuery.isPending) {
    statusKind = "loading";
  }

  return (
    <section aria-label={labels.ariaLabel} className="industrial-map">
      <div className="industrial-map__canvas" ref={containerRef} />
      {statusKind === null ? null : (
        <MapStatus kind={statusKind} labels={labels} onRetry={retry} />
      )}
      <MapAttribution labels={labels} />
    </section>
  );
}

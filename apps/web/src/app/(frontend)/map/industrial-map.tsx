"use client";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
  StyleSpecification,
} from "maplibre-gl";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  type GetMapClusterBoundaries200Data,
  type GetMapClusterPoints200Data,
  type GetMapFactories200Data,
  getGetMapClusterBoundariesQueryKey,
  getGetMapFactoriesQueryKey,
  useGetMapClusterBoundaries,
  useGetMapClusterPoints,
  useGetMapFactories,
} from "@chinasupply/api-client";
import { createChinaSupplyMapStyle } from "@chinasupply/config/map/style";

import {
  CHINA_BOUNDS,
  CLUSTER_BOUNDARIES_FILL_LAYER_ID,
  CLUSTER_BOUNDARIES_SOURCE_ID,
  CLUSTER_POINTS_LAYER_ID,
  CLUSTER_POINTS_SOURCE_ID,
  EMPTY_CLUSTER_BOUNDARIES,
  clusterPointsLayer,
  EMPTY_CLUSTER_POINTS,
  EMPTY_FACTORY_POINTS,
  FACTORIES_SOURCE_ID,
  FACTORY_CLUSTERS_LAYER_ID,
  FACTORY_POINTS_LAYER_ID,
  clusterBoundariesFillLayer,
  factoryClusterCountLayer,
  factoryClustersLayer,
  factoryPointsLayer,
  factorySourceOptions,
  MAPLIBRE_WORKER_URL,
} from "./map-config";
import { MapAttribution, type MapAttributionLabels } from "./map-attribution";
import {
  MapStatus,
  type MapStatusKind,
  type MapStatusLabels,
} from "./map-status";
import { MapTruncationNotice } from "./map-truncation-notice";
import {
  CLUSTER_BOUNDARY_MIN_ZOOM,
  createDebouncedViewportUpdater,
  FACTORY_POINT_MIN_ZOOM,
  type MapViewport,
  readMapViewport,
} from "./map-viewport";
import {
  resolveMapClickTarget,
  type SelectedMapFeature,
} from "./map-selection";
import { MapSelectionCard } from "./map-selection-card";

export interface IndustrialMapLabels
  extends MapAttributionLabels, MapStatusLabels {
  ariaLabel: string;
  truncated: string;
}

type MapLoadState = "error" | "loading" | "ready";

const DISABLED_BOUNDARY_PARAMS = {
  bbox: "0,0,1,1",
  zoom: 0,
};
const DISABLED_FACTORY_PARAMS = {
  bbox: "0,0,1,1",
};
const INTERACTIVE_LAYER_IDS = [
  FACTORY_CLUSTERS_LAYER_ID,
  FACTORY_POINTS_LAYER_ID,
  CLUSTER_POINTS_LAYER_ID,
  CLUSTER_BOUNDARIES_FILL_LAYER_ID,
] as const;

export function IndustrialMap({
  labels,
}: Readonly<{ labels: IndustrialMapLabels }>) {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const clusterPointsRef =
    useRef<GetMapClusterPoints200Data>(EMPTY_CLUSTER_POINTS);
  const clusterBoundariesRef = useRef<GetMapClusterBoundaries200Data>(
    EMPTY_CLUSTER_BOUNDARIES,
  );
  const factoryPointsRef = useRef<GetMapFactories200Data>(EMPTY_FACTORY_POINTS);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedMapFeature | null>(null);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [viewportIsSettling, setViewportIsSettling] = useState(true);
  const boundariesEnabled =
    viewport !== null && viewport.zoom >= CLUSTER_BOUNDARY_MIN_ZOOM;
  const factoriesEnabled =
    viewport !== null && viewport.zoom >= FACTORY_POINT_MIN_ZOOM;
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
    clusterPointsRef.current = clusterPoints;
    const source = mapRef.current?.getSource(
      CLUSTER_POINTS_SOURCE_ID,
    ) as GeoJSONSource | null;
    source?.setData(clusterPoints);
  }, [clusterPoints]);

  useEffect(() => {
    clusterBoundariesRef.current = clusterBoundaries;
    const source = mapRef.current?.getSource(
      CLUSTER_BOUNDARIES_SOURCE_ID,
    ) as GeoJSONSource | null;
    source?.setData(clusterBoundaries);
  }, [clusterBoundaries]);

  useEffect(() => {
    factoryPointsRef.current = factoryPoints;
    const source = mapRef.current?.getSource(
      FACTORIES_SOURCE_ID,
    ) as GeoJSONSource | null;
    source?.setData(factoryPoints);
  }, [factoryPoints]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    let disposed = false;
    let activeMap: MapLibreMap | null = null;
    const viewportUpdater = createDebouncedViewportUpdater((nextViewport) => {
      setViewport(nextViewport);
      setViewportIsSettling(false);
    });

    setMapLoadState("loading");
    setViewport(null);
    setViewportIsSettling(true);

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
        const cancelViewportQueries = () => {
          setViewportIsSettling(true);
          viewportUpdater.cancel();
          void Promise.all([
            queryClient.cancelQueries({
              queryKey: getGetMapClusterBoundariesQueryKey(),
            }),
            queryClient.cancelQueries({
              queryKey: getGetMapFactoriesQueryKey(),
            }),
          ]);
        };
        const scheduleViewportUpdate = () => {
          const nextViewport = readMapViewport(map);
          if (nextViewport === null) {
            viewportUpdater.cancel();
            setViewport(null);
            setViewportIsSettling(false);
            return;
          }

          viewportUpdater.schedule(nextViewport);
        };
        const handleMapClick = (event: MapMouseEvent) => {
          const readFirstFeature = (layerId: string) =>
            map.queryRenderedFeatures(event.point, {
              layers: [layerId],
            })[0];
          const target = resolveMapClickTarget({
            clusterBoundary: readFirstFeature(CLUSTER_BOUNDARIES_FILL_LAYER_ID),
            clusterPoint: readFirstFeature(CLUSTER_POINTS_LAYER_ID),
            factoryCluster: readFirstFeature(FACTORY_CLUSTERS_LAYER_ID),
            factoryPoint: readFirstFeature(FACTORY_POINTS_LAYER_ID),
          });

          if (target.kind === "selection") {
            setSelectedFeature(target.selection);
            return;
          }

          setSelectedFeature(null);
          if (target.kind === "empty") return;

          const source = map.getSource(FACTORIES_SOURCE_ID) as GeoJSONSource;
          void source
            .getClusterExpansionZoom(target.clusterId)
            .then((zoom) => {
              if (disposed) return;
              map.easeTo({
                center: target.coordinates,
                duration: 500,
                zoom,
              });
            })
            .catch(() => undefined);
        };
        const showInteractiveCursor = () => {
          map.getCanvas().style.cursor = "pointer";
        };
        const hideInteractiveCursor = () => {
          map.getCanvas().style.cursor = "";
        };

        map.on("movestart", cancelViewportQueries);
        map.on("moveend", scheduleViewportUpdate);
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
          map.addSource(CLUSTER_BOUNDARIES_SOURCE_ID, {
            data: clusterBoundariesRef.current,
            type: "geojson",
          });
          map.addLayer(clusterBoundariesFillLayer);
          map.addSource(CLUSTER_POINTS_SOURCE_ID, {
            data: clusterPointsRef.current,
            type: "geojson",
          });
          map.addLayer(clusterPointsLayer);
          map.addSource(FACTORIES_SOURCE_ID, {
            data: factoryPointsRef.current,
            type: "geojson",
            ...factorySourceOptions,
          });
          map.addLayer(factoryClustersLayer);
          map.addLayer(factoryClusterCountLayer);
          map.addLayer(factoryPointsLayer);
          map.on("click", handleMapClick);
          for (const layerId of INTERACTIVE_LAYER_IDS) {
            map.on("mouseenter", layerId, showInteractiveCursor);
            map.on("mouseleave", layerId, hideInteractiveCursor);
          }
          scheduleViewportUpdate();
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
      viewportUpdater.cancel();
      void Promise.all([
        queryClient.cancelQueries({
          queryKey: getGetMapClusterBoundariesQueryKey(),
        }),
        queryClient.cancelQueries({
          queryKey: getGetMapFactoriesQueryKey(),
        }),
      ]);
      if (mapRef.current === activeMap) mapRef.current = null;
      activeMap?.remove();
    };
  }, [mapAttempt, queryClient]);

  const retry = () => {
    if (mapLoadState === "error") {
      void clusterPointsQuery.refetch();
      setMapAttempt((attempt) => attempt + 1);
      return;
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
  const showTruncatedNotice =
    factoriesEnabled &&
    !viewportIsSettling &&
    !factoryPointsQuery.isPlaceholderData &&
    factoryPointsQuery.data?.meta.truncated === true;

  let statusKind: MapStatusKind | null = null;
  if (mapLoadState === "error") {
    statusKind = "map-error";
  } else if (hasDataError) {
    statusKind = "data-error";
  } else if (mapLoadState === "loading" || hasPendingData) {
    statusKind = "loading";
  }

  return (
    <section
      aria-label={labels.ariaLabel}
      className={`industrial-map${selectedFeature === null ? "" : " industrial-map--has-selection"}`}
    >
      <div className="industrial-map__canvas" ref={containerRef} />
      {statusKind === null ? null : (
        <MapStatus kind={statusKind} labels={labels} onRetry={retry} />
      )}
      {showTruncatedNotice ? (
        <MapTruncationNotice message={labels.truncated} />
      ) : null}
      {selectedFeature === null ? null : (
        <MapSelectionCard
          onClose={() => {
            setSelectedFeature(null);
          }}
          selection={selectedFeature}
        />
      )}
      <MapAttribution labels={labels} />
    </section>
  );
}

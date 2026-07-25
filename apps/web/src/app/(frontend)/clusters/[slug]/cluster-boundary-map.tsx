"use client";

import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type {
  GetCluster200DataBoundary,
  GetCluster200DataCentroid,
} from "@chinasupply/api-client";
import { createChinaSupplyMapStyle } from "@chinasupply/config/map/style";

import { MapAttribution } from "../../map/map-attribution";
import { MAPLIBRE_WORKER_URL } from "../../map/map-config";
import {
  hasRenderableMapSize,
  observeRenderableMapContainer,
} from "../../map/map-container-size";
import { MapStatus } from "../../map/map-status";

import styles from "./cluster-detail.module.css";

const BOUNDARY_SOURCE_ID = "cluster-detail-boundary";
const BOUNDARY_FILL_LAYER_ID = "cluster-detail-boundary-fill";
const BOUNDARY_LINE_LAYER_ID = "cluster-detail-boundary-line";
const CENTROID_SOURCE_ID = "cluster-detail-centroid";
const CENTROID_LAYER_ID = "cluster-detail-centroid-point";

export type ClusterMapBounds = [[number, number], [number, number]];

export function getClusterBoundaryBounds(
  boundary: GetCluster200DataBoundary,
): ClusterMapBounds | null {
  if (boundary === null) return null;

  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;

  for (const polygon of boundary.coordinates) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        west = Math.min(west, longitude);
        south = Math.min(south, latitude);
        east = Math.max(east, longitude);
        north = Math.max(north, latitude);
      }
    }
  }

  if (
    ![east, north, south, west].every(Number.isFinite) ||
    east <= west ||
    north <= south
  ) {
    return null;
  }

  return [
    [west, south],
    [east, north],
  ];
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
  const translate = useTranslations("ClusterDetail.map");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"error" | "loading" | "ready">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    let activeMap: MapLibreMap | null = null;
    let disposed = false;
    let initializationStarted = false;

    setState("loading");

    const initializeMap = () => {
      if (
        disposed ||
        initializationStarted ||
        !hasRenderableMapSize(container)
      ) {
        return;
      }
      initializationStarted = true;

      void import("maplibre-gl")
        .then(({ Map, setWorkerUrl }) => {
          if (disposed) return;
          if (!hasRenderableMapSize(container)) {
            initializationStarted = false;
            return;
          }

          setWorkerUrl(MAPLIBRE_WORKER_URL);
          const map = new Map({
            attributionControl: false,
            center: centroid.coordinates,
            container,
            interactive: false,
            style: createChinaSupplyMapStyle(
              process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "",
            ) as unknown as StyleSpecification,
            trackResize: false,
            zoom: 10,
          });

          activeMap = map;
          mapRef.current = map;

          let initialLoadComplete = false;
          const handleInitialError = () => {
            if (!initialLoadComplete && !disposed) setState("error");
          };
          const handleStyleLoad = () => {
            if (disposed) return;

            initialLoadComplete = true;
            map.off("error", handleInitialError);

            if (boundary !== null) {
              map.addSource(BOUNDARY_SOURCE_ID, {
                data: {
                  features: [
                    {
                      geometry: boundary,
                      properties: { color },
                      type: "Feature",
                    },
                  ],
                  type: "FeatureCollection",
                },
                type: "geojson",
              });
              map.addLayer({
                id: BOUNDARY_FILL_LAYER_ID,
                paint: {
                  "fill-color": ["get", "color"],
                  "fill-opacity": 0.3,
                },
                source: BOUNDARY_SOURCE_ID,
                type: "fill",
              });
              map.addLayer({
                id: BOUNDARY_LINE_LAYER_ID,
                paint: {
                  "line-color": ["get", "color"],
                  "line-opacity": 0.92,
                  "line-width": 2.5,
                },
                source: BOUNDARY_SOURCE_ID,
                type: "line",
              });
            }

            map.addSource(CENTROID_SOURCE_ID, {
              data: {
                geometry: centroid,
                properties: { color },
                type: "Feature",
              },
              type: "geojson",
            });
            map.addLayer({
              id: CENTROID_LAYER_ID,
              paint: {
                "circle-color": ["get", "color"],
                "circle-radius": boundary === null ? 7 : 5,
                "circle-stroke-color": "#FFFFFF",
                "circle-stroke-width": 2.5,
              },
              source: CENTROID_SOURCE_ID,
              type: "circle",
            });

            const bounds = getClusterBoundaryBounds(boundary);
            if (bounds !== null) {
              map.fitBounds(bounds, {
                animate: false,
                maxZoom: 12,
                padding: 48,
              });
            }

            setState("ready");
          };

          map.on("error", handleInitialError);
          map.once("style.load", handleStyleLoad);
        })
        .catch(() => {
          if (!disposed) setState("error");
        });
    };

    const disconnectResizeObserver = observeRenderableMapContainer(
      container,
      () => {
        if (disposed) return;
        if (activeMap === null) {
          initializeMap();
          return;
        }
        activeMap.resize();
      },
    );

    return () => {
      disposed = true;
      disconnectResizeObserver();
      if (mapRef.current === activeMap) mapRef.current = null;
      activeMap?.remove();
    };
  }, [attempt, boundary, centroid, color]);

  return (
    <section
      aria-label={translate("ariaLabel", { name })}
      className={styles.map}
      data-boundary={boundary === null ? "centroid" : "polygon"}
      data-state={state}
    >
      <div className={styles.mapCanvas} ref={containerRef} />
      {boundary === null ? (
        <p className={styles.mapNotice}>{translate("boundaryUnavailable")}</p>
      ) : null}
      {state === "ready" ? null : (
        <MapStatus
          kind={state === "error" ? "map-error" : "loading"}
          labels={{
            dataError: translate("error"),
            loading: translate("loading"),
            mapError: translate("error"),
            retry: translate("retry"),
          }}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}
      <MapAttribution
        labels={{
          attributionLabel: translate("attributionLabel"),
          mapTilerLogoAlt: translate("mapTilerLogoAlt"),
        }}
      />
    </section>
  );
}

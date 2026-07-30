"use client";

import type {
  Map as MapLibreMap,
  MapMouseEvent,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { createChinaSupplyMapStyle } from "@chinasupply/config/map/style";

import { MapAttribution } from "../map/map-attribution";
import { CHINA_BOUNDS, MAPLIBRE_WORKER_URL } from "../map/map-config";
import {
  hasRenderableMapSize,
  observeRenderableMapContainer,
} from "../map/map-container-size";
import {
  createMapGlyphRuntime,
  MAP_GLYPH_PROTOCOL,
} from "../map/map-glyph-cache";
import { MapStatus } from "../map/map-status";

import styles from "./ops-dashboard.module.css";

export type OpsCoordinates = readonly [number, number];

export interface OpsPointPickerLabels {
  ariaLabel: string;
  attributionLabel: string;
  instructions: string;
  latitude: string;
  loading: string;
  longitude: string;
  mapError: string;
  mapTilerLogoAlt: string;
  retry: string;
}

export function roundMapCoordinates(
  longitude: number,
  latitude: number,
): [number, number] {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Coordinates are outside WGS-84 bounds");
  }

  return [
    Math.round(longitude * 10_000_000) / 10_000_000,
    Math.round(latitude * 10_000_000) / 10_000_000,
  ];
}

export function parseCoordinateInputs(
  longitude: string,
  latitude: string,
): [number, number] | null {
  if (longitude.trim() === "" || latitude.trim() === "") return null;
  const parsedLongitude = Number(longitude);
  const parsedLatitude = Number(latitude);
  try {
    return roundMapCoordinates(parsedLongitude, parsedLatitude);
  } catch {
    return null;
  }
}

function formatMapCoordinate(value: number): string {
  return value.toFixed(7);
}

export function OpsPointPicker({
  initialCoordinates,
  labels,
  latitudeName,
  longitudeName,
}: Readonly<{
  initialCoordinates: OpsCoordinates | null;
  labels: OpsPointPickerLabels;
  latitudeName: string;
  longitudeName: string;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const updateMarkerRef = useRef<(coordinates: [number, number]) => void>(
    () => {
      // The map initializes lazily once its container is measurable.
    },
  );
  const [attempt, setAttempt] = useState(0);
  const [latitude, setLatitude] = useState(
    initialCoordinates === null ? "" : String(initialCoordinates[1]),
  );
  const [longitude, setLongitude] = useState(
    initialCoordinates === null ? "" : String(initialCoordinates[0]),
  );
  const [state, setState] = useState<"error" | "loading" | "ready">("loading");

  const selectMapCoordinates = useCallback(
    (nextLongitude: number, nextLatitude: number) => {
      const coordinates = roundMapCoordinates(nextLongitude, nextLatitude);
      setLongitude(formatMapCoordinate(coordinates[0]));
      setLatitude(formatMapCoordinate(coordinates[1]));
      updateMarkerRef.current(coordinates);
    },
    [],
  );

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

      let style: StyleSpecification;
      let glyphRuntime: ReturnType<typeof createMapGlyphRuntime>;
      try {
        const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
        style = createChinaSupplyMapStyle(
          mapTilerKey,
        ) as unknown as StyleSpecification;
        glyphRuntime = createMapGlyphRuntime({ mapTilerKey, style });
        void glyphRuntime.prewarm(8);
      } catch {
        setState("error");
        return;
      }

      void import("maplibre-gl")
        .then(({ Map, Marker, addProtocol, setWorkerUrl }) => {
          if (disposed) return;
          if (!hasRenderableMapSize(container)) {
            initializationStarted = false;
            return;
          }

          setWorkerUrl(MAPLIBRE_WORKER_URL);
          addProtocol(MAP_GLYPH_PROTOCOL, glyphRuntime.protocolHandler);
          const map = new Map({
            attributionControl: false,
            ...(initialCoordinates === null
              ? { bounds: CHINA_BOUNDS, fitBoundsOptions: { padding: 24 } }
              : {
                  center: [initialCoordinates[0], initialCoordinates[1]],
                  zoom: 12,
                }),
            container,
            pitch: 0,
            style,
            trackResize: false,
            transformRequest: glyphRuntime.transformRequest,
          });

          const setMarker = (coordinates: [number, number]) => {
            if (markerRef.current === null) {
              const marker = new Marker({ color: "#0f766e", draggable: true })
                .setLngLat(coordinates)
                .addTo(map);
              marker.on("dragend", () => {
                const position = marker.getLngLat();
                selectMapCoordinates(position.lng, position.lat);
              });
              markerRef.current = marker;
            } else {
              markerRef.current.setLngLat(coordinates);
            }
          };

          updateMarkerRef.current = setMarker;
          if (initialCoordinates !== null) {
            setMarker([initialCoordinates[0], initialCoordinates[1]]);
          }

          activeMap = map;
          mapRef.current = map;

          let initialLoadComplete = false;
          const handleInitialError = () => {
            if (!initialLoadComplete && !disposed) setState("error");
          };
          const handleClick = (event: MapMouseEvent) => {
            selectMapCoordinates(event.lngLat.lng, event.lngLat.lat);
          };
          const handleStyleLoad = () => {
            if (disposed) return;
            initialLoadComplete = true;
            map.off("error", handleInitialError);
            setState("ready");
          };

          map.on("click", handleClick);
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
      updateMarkerRef.current = () => {};
      markerRef.current?.remove();
      markerRef.current = null;
      if (mapRef.current === activeMap) mapRef.current = null;
      activeMap?.remove();
    };
  }, [attempt, initialCoordinates, selectMapCoordinates]);

  const updateFromInput = (axis: "latitude" | "longitude", value: string) => {
    const nextLongitude = axis === "longitude" ? value : longitude;
    const nextLatitude = axis === "latitude" ? value : latitude;
    if (axis === "longitude") setLongitude(value);
    else setLatitude(value);

    const coordinates = parseCoordinateInputs(nextLongitude, nextLatitude);
    if (coordinates !== null) updateMarkerRef.current(coordinates);
  };

  return (
    <section className={styles.pointPicker}>
      <div
        aria-label={labels.ariaLabel}
        className={styles.pointPickerMap}
        data-coordinate-order="lng-lat"
        data-state={state}
      >
        <div className={styles.pointPickerCanvas} ref={containerRef} />
        {state === "ready" ? null : (
          <MapStatus
            kind={state === "error" ? "map-error" : "loading"}
            labels={{
              dataError: labels.mapError,
              loading: labels.loading,
              mapError: labels.mapError,
              retry: labels.retry,
            }}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        )}
        <MapAttribution labels={labels} />
      </div>
      <p className={styles.pointPickerInstructions}>{labels.instructions}</p>
      <div className={styles.coordinateFields}>
        <label className={styles.field}>
          <span>{labels.longitude}</span>
          <input
            inputMode="decimal"
            max={180}
            min={-180}
            name={longitudeName}
            onChange={(event) =>
              updateFromInput("longitude", event.target.value)
            }
            required
            step="any"
            type="number"
            value={longitude}
          />
        </label>
        <label className={styles.field}>
          <span>{labels.latitude}</span>
          <input
            inputMode="decimal"
            max={90}
            min={-90}
            name={latitudeName}
            onChange={(event) =>
              updateFromInput("latitude", event.target.value)
            }
            required
            step="any"
            type="number"
            value={latitude}
          />
        </label>
      </div>
    </section>
  );
}

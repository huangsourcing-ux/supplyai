"use client";

import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";

import type { GetFactory200DataLocation } from "@chinasupply/api-client";
import { createChinaSupplyMapStyle } from "@chinasupply/config/map/style";

import { MapAttribution } from "../../map/map-attribution";
import { MAPLIBRE_WORKER_URL } from "../../map/map-config";
import {
  hasRenderableMapSize,
  observeRenderableMapContainer,
} from "../../map/map-container-size";
import {
  createMapGlyphRuntime,
  MAP_GLYPH_PROTOCOL,
} from "../../map/map-glyph-cache";
import { MapStatus } from "../../map/map-status";

import styles from "./factory-detail.module.css";

const FACTORY_SOURCE_ID = "factory-detail-location";
const FACTORY_LAYER_ID = "factory-detail-location-point";

export function FactoryLocationMap({
  location,
  name,
  verified,
}: Readonly<{
  location: GetFactory200DataLocation;
  name: string;
  verified: boolean;
}>) {
  const translate = useTranslations("FactoryDetail.map");
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

      let style: StyleSpecification;
      let glyphRuntime: ReturnType<typeof createMapGlyphRuntime>;
      try {
        const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
        style = createChinaSupplyMapStyle(
          mapTilerKey,
        ) as unknown as StyleSpecification;
        glyphRuntime = createMapGlyphRuntime({ mapTilerKey, style });
        void glyphRuntime.prewarm(14);
      } catch {
        setState("error");
        return;
      }

      void import("maplibre-gl")
        .then(({ Map, addProtocol, setWorkerUrl }) => {
          if (disposed) return;
          if (!hasRenderableMapSize(container)) {
            initializationStarted = false;
            return;
          }

          setWorkerUrl(MAPLIBRE_WORKER_URL);
          addProtocol(MAP_GLYPH_PROTOCOL, glyphRuntime.protocolHandler);
          const map = new Map({
            attributionControl: false,
            center: location.coordinates,
            container,
            interactive: false,
            pitch: 0,
            style,
            trackResize: false,
            transformRequest: glyphRuntime.transformRequest,
            zoom: 14,
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
            map.addSource(FACTORY_SOURCE_ID, {
              data: {
                geometry: location,
                properties: { verified },
                type: "Feature",
              },
              type: "geojson",
            });
            map.addLayer({
              id: FACTORY_LAYER_ID,
              paint: {
                "circle-color": verified ? "#2563EB" : "#64748B",
                "circle-radius": 8,
                "circle-stroke-color": "#FFFFFF",
                "circle-stroke-width": 3,
              },
              source: FACTORY_SOURCE_ID,
              type: "circle",
            });
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
  }, [attempt, location, verified]);

  return (
    <div
      aria-label={translate("ariaLabel", { name })}
      className={styles.map}
      data-coordinate-order="lng-lat"
      data-state={state}
    >
      <div className={styles.mapCanvas} ref={containerRef} />
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
    </div>
  );
}

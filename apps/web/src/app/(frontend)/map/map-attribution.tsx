import Image from "next/image";
import React from "react";

export interface MapAttributionLabels {
  attributionLabel: string;
  mapTilerLogoAlt: string;
}

export function MapAttribution({
  labels,
}: Readonly<{ labels: MapAttributionLabels }>) {
  return (
    <aside aria-label={labels.attributionLabel} className="map-attribution">
      <a
        className="map-attribution__logo"
        href="https://www.maptiler.com/"
        rel="noreferrer"
        target="_blank"
      >
        <Image
          alt={labels.mapTilerLogoAlt}
          height={21}
          src="https://api.maptiler.com/resources/logo.svg"
          unoptimized
          width={68}
        />
      </a>
      <span className="map-attribution__credits">
        <a
          href="https://www.maptiler.com/copyright/"
          rel="noreferrer"
          target="_blank"
        >
          © MapTiler
        </a>
        <span aria-hidden="true"> · </span>
        <a
          href="https://www.openstreetmap.org/copyright"
          rel="noreferrer"
          target="_blank"
        >
          © OpenStreetMap contributors
        </a>
      </span>
    </aside>
  );
}

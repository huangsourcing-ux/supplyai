"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import React from "react";

import { useGetCluster, useGetFactory } from "@chinasupply/api-client";

import type { SelectedMapFeature } from "./map-selection";

export type MapSelectionDetailState =
  | {
      imageUrl: string | null;
      mainProducts: string[];
      status: "ready";
    }
  | {
      status: "error";
    }
  | {
      status: "loading";
    };

export type MapSelectionCardLabels = {
  close: string;
  detailError: string;
  entityType: string;
  factoryCountOrVerification: string;
  loadingDetails: string;
  mainProducts: string;
  retry: string;
  viewDetails: string;
};

export function MapSelectionCardView({
  detail,
  labels,
  onClose,
  onRetry,
  selection,
}: Readonly<{
  detail: MapSelectionDetailState;
  labels: MapSelectionCardLabels;
  onClose: () => void;
  onRetry: () => void;
  selection: SelectedMapFeature;
}>) {
  const detailHref =
    selection.kind === "cluster"
      ? `/clusters/${selection.slug}`
      : `/factories/${selection.slug}`;

  return (
    <aside
      aria-label={`${labels.entityType}: ${selection.name}`}
      aria-live="polite"
      aria-busy={detail.status === "loading"}
      className="map-selection-card"
      data-kind={selection.kind}
      data-state={detail.status}
      data-verified={
        selection.kind === "factory" ? selection.verified : undefined
      }
    >
      <button
        aria-label={labels.close}
        className="map-selection-card__close"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>

      <div className="map-selection-card__image">
        {detail.status === "ready" && detail.imageUrl !== null ? (
          <Image
            alt=""
            fill
            sizes="(min-width: 64rem) 22rem, calc(100vw - 1rem)"
            src={detail.imageUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className={
              detail.status === "loading"
                ? "map-selection-card__image-placeholder map-selection-card__skeleton"
                : "map-selection-card__image-placeholder"
            }
          />
        )}
      </div>

      <div className="map-selection-card__content">
        <p className="map-selection-card__eyebrow">{labels.entityType}</p>
        <h2>{selection.name}</h2>
        <p
          className={`map-selection-card__badge map-selection-card__badge--${selection.kind}`}
        >
          {labels.factoryCountOrVerification}
        </p>

        <div className="map-selection-card__products">
          <h3>{labels.mainProducts}</h3>
          {detail.status === "loading" ? (
            <div
              aria-label={labels.loadingDetails}
              className="map-selection-card__product-skeletons"
              role="status"
            >
              <span
                aria-hidden="true"
                className="map-selection-card__product-skeleton"
              />
              <span
                aria-hidden="true"
                className="map-selection-card__product-skeleton"
              />
              <span
                aria-hidden="true"
                className="map-selection-card__product-skeleton"
              />
            </div>
          ) : detail.status === "error" ? (
            <div className="map-selection-card__error" role="alert">
              <span>{labels.detailError}</span>
              <button onClick={onRetry} type="button">
                {labels.retry}
              </button>
            </div>
          ) : (
            <ul className="map-selection-card__product-list">
              {detail.mainProducts.map((product, index) => (
                <li key={`${product}-${index}`}>{product}</li>
              ))}
            </ul>
          )}
        </div>

        <Link className="map-selection-card__link" href={detailHref}>
          {labels.viewDetails}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}

export function MapSelectionCard({
  onClose,
  selection,
}: Readonly<{
  onClose: () => void;
  selection: SelectedMapFeature;
}>) {
  const translate = useTranslations("Map.card");
  const isCluster = selection.kind === "cluster";
  const clusterQuery = useGetCluster(isCluster ? selection.slug : "", {
    query: {
      enabled: isCluster,
    },
  });
  const factoryQuery = useGetFactory(isCluster ? "" : selection.slug, {
    query: {
      enabled: !isCluster,
    },
  });
  const activeQuery = isCluster ? clusterQuery : factoryQuery;

  let detail: MapSelectionDetailState;
  if (activeQuery.isError) {
    detail = { status: "error" };
  } else if (activeQuery.data === undefined) {
    detail = { status: "loading" };
  } else if (isCluster) {
    detail = {
      imageUrl: clusterQuery.data?.data.coverImageUrl ?? null,
      mainProducts: clusterQuery.data?.data.mainProducts ?? [],
      status: "ready",
    };
  } else {
    detail = {
      imageUrl: factoryQuery.data?.data.imageUrl ?? null,
      mainProducts: factoryQuery.data?.data.mainProducts ?? [],
      status: "ready",
    };
  }

  const labels: MapSelectionCardLabels = {
    close: translate("close"),
    detailError: translate("detailError"),
    entityType: translate(isCluster ? "cluster" : "factory"),
    factoryCountOrVerification: isCluster
      ? translate("factoryCount", { count: selection.factoryCount })
      : translate(selection.verified ? "verified" : "unverified"),
    loadingDetails: translate("loadingDetails"),
    mainProducts: translate("mainProducts"),
    retry: translate("retry"),
    viewDetails: translate(
      isCluster ? "viewClusterDetails" : "viewFactoryDetails",
    ),
  };

  return (
    <MapSelectionCardView
      detail={detail}
      labels={labels}
      onClose={onClose}
      onRetry={() => {
        void activeQuery.refetch();
      }}
      selection={selection}
    />
  );
}

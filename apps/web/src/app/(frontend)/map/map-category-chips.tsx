import type { GetCategories200DataItem } from "@chinasupply/api-client";
import React from "react";

import {
  resolveCategoryChipSelection,
  type MapCategory,
} from "./map-search-model";

export interface MapCategoryChipsLabels {
  all: string;
  error: string;
  group: string;
  loading: string;
  removeCategory: (category: string) => string;
  retry: string;
}

export function MapCategoryChips({
  activeCategory,
  categories,
  error,
  labels,
  loading,
  onChoose,
  onRetry,
}: Readonly<{
  activeCategory: MapCategory | null;
  categories: readonly GetCategories200DataItem[];
  error: boolean;
  labels: MapCategoryChipsLabels;
  loading: boolean;
  onChoose: (category: MapCategory | null) => void;
  onRetry: () => void;
}>) {
  const selection = resolveCategoryChipSelection(categories, activeCategory);

  return (
    <div className="map-category-filter">
      <div
        aria-label={labels.group}
        className="map-category-chips"
        role="group"
      >
        <button
          aria-pressed={selection.kind === "all"}
          className="map-category-chip"
          onClick={() => {
            onChoose(null);
          }}
          type="button"
        >
          {labels.all}
        </button>
        {categories.map((category) => (
          <button
            aria-pressed={
              selection.kind === "root" && selection.slug === category.slug
            }
            className="map-category-chip"
            key={category.id}
            onClick={() => {
              onChoose({
                name: category.name,
                slug: category.slug,
              });
            }}
            type="button"
          >
            <span
              aria-hidden="true"
              className="map-category-chip__color"
              style={{
                backgroundColor: category.color ?? undefined,
              }}
            />
            <span>{category.name}</span>
          </button>
        ))}

        {loading ? (
          <div className="map-category-filter__status" role="status">
            <span aria-hidden="true" className="map-search__spinner" />
            <span>{labels.loading}</span>
          </div>
        ) : null}

        {error ? (
          <div
            className="map-category-filter__status map-category-filter__status--error"
            role="alert"
          >
            <span>{labels.error}</span>
            <button onClick={onRetry} type="button">
              {labels.retry}
            </button>
          </div>
        ) : null}

        {selection.kind === "child" ? (
          <div className="map-search__filter">
            <span>{activeCategory?.name}</span>
            <button
              aria-label={labels.removeCategory(activeCategory?.name ?? "")}
              onClick={() => {
                onChoose(null);
              }}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

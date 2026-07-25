import React from "react";

import type { MapSearchChoice } from "./map-search-model";

export type MapSearchResultLabels = {
  categories: string;
  categoryResult: string;
  clusters: string;
  error: string;
  factories: string;
  factoryCount: (count: number) => string;
  loading: string;
  loadingPopular: string;
  noResults: string;
  popularCategories: string;
  results: string;
  retry: string;
  unverified: string;
  verified: string;
};

type SearchResultGroup = {
  choices: MapSearchChoice[];
  label: string;
};

function getChoiceMetadata(
  choice: MapSearchChoice,
  labels: MapSearchResultLabels,
): string {
  if (choice.type === "category") return labels.categoryResult;
  if (choice.type === "cluster") {
    return labels.factoryCount(choice.factoryCount);
  }
  return choice.verified ? labels.verified : labels.unverified;
}

function groupChoices(
  choices: readonly MapSearchChoice[],
  labels: MapSearchResultLabels,
  popular: boolean,
): SearchResultGroup[] {
  if (popular) {
    return [
      {
        choices: choices.filter((choice) => choice.type === "category"),
        label: labels.popularCategories,
      },
    ];
  }

  return [
    {
      choices: choices.filter((choice) => choice.type === "category"),
      label: labels.categories,
    },
    {
      choices: choices.filter((choice) => choice.type === "cluster"),
      label: labels.clusters,
    },
    {
      choices: choices.filter((choice) => choice.type === "factory"),
      label: labels.factories,
    },
  ];
}

export function MapSearchResults({
  activeIndex,
  choices,
  error,
  labels,
  loading,
  loadingPopular,
  noResults,
  onChoose,
  onRetry,
  optionIdPrefix,
}: Readonly<{
  activeIndex: number;
  choices: readonly MapSearchChoice[];
  error: boolean;
  labels: MapSearchResultLabels;
  loading: boolean;
  loadingPopular: boolean;
  noResults: boolean;
  onChoose: (choice: MapSearchChoice) => void;
  onRetry: () => void;
  optionIdPrefix: string;
}>) {
  if (loading) {
    return (
      <div className="map-search__status" role="status">
        <span aria-hidden="true" className="map-search__spinner" />
        {labels.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="map-search__status map-search__status--error"
        role="alert"
      >
        <span>{labels.error}</span>
        <button onClick={onRetry} type="button">
          {labels.retry}
        </button>
      </div>
    );
  }

  const groups = groupChoices(choices, labels, noResults);

  return (
    <>
      {noResults ? (
        <p className="map-search__empty">{labels.noResults}</p>
      ) : null}
      {loadingPopular ? (
        <div className="map-search__status" role="status">
          <span aria-hidden="true" className="map-search__spinner" />
          {labels.loadingPopular}
        </div>
      ) : null}
      {choices.length === 0 ? null : (
        <div
          aria-label={labels.results}
          className="map-search__list"
          role="listbox"
        >
          {groups.map((group) => {
            if (group.choices.length === 0) return null;

            return (
              <div
                aria-label={group.label}
                className="map-search__group"
                key={group.label}
                role="group"
              >
                <p className="map-search__group-label">{group.label}</p>
                {group.choices.map((choice) => {
                  const optionIndex = choices.indexOf(choice);

                  return (
                    <button
                      aria-selected={optionIndex === activeIndex}
                      className="map-search__option"
                      id={`${optionIdPrefix}-${optionIndex}`}
                      key={`${choice.type}-${choice.id}`}
                      onClick={() => {
                        onChoose(choice);
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      role="option"
                      tabIndex={-1}
                      type="button"
                    >
                      <span className="map-search__option-name">
                        {choice.name}
                      </span>
                      <span className="map-search__option-meta">
                        {getChoiceMetadata(choice, labels)}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

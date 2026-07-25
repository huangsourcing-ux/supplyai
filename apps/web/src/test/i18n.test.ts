import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n/config";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("Web internationalization contract", () => {
  it("ships English as the only V1 locale", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(SUPPORTED_LOCALES).toEqual(["en"]);
  });

  it("provides messages for every application-owned page", () => {
    const messages = JSON.parse(
      readFileSync(path.join(applicationDirectory, "messages/en.json"), "utf8"),
    );

    expect(messages.Metadata).toBeTypeOf("object");
    expect(messages.Home).toBeTypeOf("object");
    expect(messages.Map).toMatchObject({
      card: {
        close: "Close details",
        cluster: "Industrial cluster",
        detailError: "Details could not be loaded.",
        factory: "Factory",
        factoryCount: "{count, plural, one {# factory} other {# factories}}",
        loadingDetails: "Loading details",
        mainProducts: "Main products",
        retry: "Retry",
        unverified: "Unverified",
        verified: "Verified",
        viewClusterDetails: "View cluster details",
        viewFactoryDetails: "View factory details",
      },
      dataError: "Map data could not be loaded.",
      loading: "Loading industrial clusters…",
      mapError: "The map could not be loaded.",
      mapTilerLogoAlt: "MapTiler logo",
      retry: "Retry",
      search: {
        categoryResult: "Category",
        clear: "Clear search",
        error: "Search could not be completed.",
        groups: {
          categories: "Categories",
          clusters: "Industrial clusters",
          factories: "Factories",
        },
        loading: "Searching…",
        noResults:
          "No matching suppliers found. Try another product or browse a popular category.",
        popularCategories: "Popular categories",
        results: "Search results",
      },
      truncated: "Zoom in to see all factories",
    });
    expect(messages.Operations).toMatchObject({
      dashboard: {
        actionError: "The operation could not be completed.",
        authError: "The administrator session could not be authorized.",
        clusterCount: "{count, plural, one {# cluster} other {# clusters}}",
        factoryCount: "{count, plural, one {# factory} other {# factories}}",
        formError:
          "Review the form values and use English | Chinese for each product line.",
        publish: "Publish",
        publishingBlocked: "Verify this factory before publishing it.",
        retry: "Retry",
        statusDraft: "Draft",
        statusPublished: "Published",
        unpublish: "Unpublish",
        unverified: "Unverified",
        verified: "Verified",
        verify: "Verify factory",
      },
    });
  });
});

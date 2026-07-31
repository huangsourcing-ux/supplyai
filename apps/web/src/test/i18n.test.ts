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
    expect(messages.Authentication).toMatchObject({
      legalNotice:
        "By creating an account, you agree to the <terms>Terms of Use</terms> and acknowledge the <privacy>Privacy Policy</privacy>.",
      signInDescription:
        "Sign in or create an account with email or Google. You will return to where you left off.",
      signInEyebrow: "Buyer account",
      signInTitle: "Save suppliers for later",
    });
    expect(messages.Navigation).toMatchObject({
      about: "About",
      account: "Account",
      analytics: "Analytics",
      guides: "Guides",
      map: "Map",
      saved: "Saved",
    });
    expect(messages.AnalyticsConsent).toMatchObject({
      allow: "Allow analytics",
      privacyLink: "Read the Privacy Policy",
      reject: "Reject analytics",
      title: "Help us improve ChinaSupply.AI",
    });
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
        categories: {
          all: "All categories",
          error: "Categories could not be loaded.",
          group: "Filter map by category",
          loading: "Loading categories…",
        },
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
    expect(messages.ClusterDetail).toMatchObject({
      backToMap: "Back to the map",
      factories: {
        heading: "Factories in this cluster",
        loadMore: "Load more factories",
        retry: "Try again",
      },
      map: {
        attributionLabel: "Map data attribution",
        boundaryUnavailable:
          "Boundary data is not available yet. Showing the cluster center.",
      },
      saveAction: {
        retry: "Try saving again",
        save: "Save cluster",
        saved: "Saved",
        signInHint: "Sign in to save this cluster.",
      },
      stats: {
        factoryCount: "Factories",
        heading: "Cluster at a glance",
      },
    });
    expect(messages.FactoryDetail).toMatchObject({
      address: {
        chinese: "Chinese address",
        english: "English address",
        heading: "Address",
      },
      backToMap: "Back to the map",
      contact: {
        heading: "Contact",
        visitWebsite: "Visit official website",
      },
      details: {
        heading: "Factory information",
        mainProducts: "Main products",
      },
      map: {
        attributionLabel: "Map data attribution",
        heading: "Factory location",
      },
      navigation: {
        heading: "Plan a visit",
        providers: {
          amap: "Amap",
          apple: "Apple Maps",
          baidu: "Baidu Maps",
          google: "Google Maps",
        },
      },
      related: {
        heading: "Related factories",
      },
      saveAction: {
        save: "Save factory",
        saved: "Saved",
      },
    });
    expect(messages.Guides).toMatchObject({
      aiGenerated: "AI-generated illustration",
      clusterCard: {
        unavailable: "This industrial cluster is currently unavailable.",
      },
      empty: "No published guides are available yet.",
      title: "Explore China's industrial clusters",
    });
    expect(messages.About).toMatchObject({
      contact: {
        title: "Questions, corrections, or feedback",
      },
      metadata: {
        title: "About ChinaSupply.AI",
      },
      title: "A clearer way to understand where China makes things",
    });
    expect(messages.Favorites).toMatchObject({
      remove: "Remove",
      tabs: {
        cluster: "Industrial clusters",
        factory: "Factories",
      },
      unavailable: {
        title: "Saved item unavailable",
      },
    });
    expect(messages.Account).toMatchObject({
      delete: {
        action: "Delete account",
        cancel: "Keep account",
      },
      language: {
        english: "English",
      },
      signOut: {
        action: "Sign out",
      },
    });
    expect(messages.Legal).toMatchObject({
      privacy: {
        metadata: {
          title: "Privacy Policy | ChinaSupply.AI",
        },
        sections: {
          analytics: {
            paragraph1: expect.stringContaining("browser storage"),
          },
          retention: {
            items: {
              deleted: expect.stringContaining("disabled local record"),
            },
          },
          sharing: {
            paragraph2: expect.stringContaining(
              "We do not sell personal information",
            ),
          },
        },
      },
      shared: {
        company: {
          address: "61 Bridge Street, Kington, United Kingdom, HR5 3DJ",
          email: "huang.sourcing@gmail.com",
          name: "HUANG SOURCING LTD",
          number: "17241958",
          registration: "Registered in England and Wales",
        },
        effectiveDate: "July 26, 2026",
      },
      terms: {
        metadata: {
          title: "Terms of Use | ChinaSupply.AI",
        },
        sections: {
          liability: {
            paragraph3: expect.stringContaining("£100"),
          },
          verified: {
            paragraph1: expect.stringContaining("point-in-time"),
          },
        },
      },
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

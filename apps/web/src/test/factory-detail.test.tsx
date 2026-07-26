import { existsSync } from "node:fs";

import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetFactory200, GetFactory200Data } from "@chinasupply/api-client";
import { buildNavUrl } from "@chinasupply/geo/navigation";

vi.mock("../app/(frontend)/favorites/favorite-save-action", () => ({
  FavoriteSaveAction: ({ labels }: { labels: { signInHint: string } }) => (
    <div data-testid="factory-save-action">{labels.signInHint}</div>
  ),
}));

import { copyTextToClipboard } from "../app/(frontend)/factories/[slug]/factory-clipboard";
import {
  hasFactoryContact,
  safeWebsiteHref,
} from "../app/(frontend)/factories/[slug]/factory-contact";
import { FactoryDetailContent } from "../app/(frontend)/factories/[slug]/factory-detail-content";
import { isMissingFactoryResponse } from "../app/(frontend)/factories/[slug]/factory-errors";
import { formatVerificationMonth } from "../app/(frontend)/factories/[slug]/factory-formatters";
import { FactoryLocationMap } from "../app/(frontend)/factories/[slug]/factory-location-map";
import { buildFactoryMetadata } from "../app/(frontend)/factories/[slug]/factory-metadata";
import {
  buildFactoryNavigationOptions,
  detectFactoryNavigationPlatform,
  launchAppWithFallback,
  NAVIGATION_FALLBACK_DELAY_MS,
  type NavigationLaunchRuntime,
} from "../app/(frontend)/factories/[slug]/factory-navigation";

const factory: GetFactory200Data = {
  address: {
    en: "No. 18 Haibin Road, Dongguan, Guangdong, China",
    zh: "中国广东省东莞市长安镇乌沙海滨路18号",
  },
  categories: [
    {
      color: "#2563EB",
      icon: null,
      id: "cat000000000000000001",
      name: "Electronics",
      parentId: null,
      slug: "electronics",
      sortOrder: 1,
    },
  ],
  certifications: ["ISO 9001", "BSCI"],
  cluster: {
    id: "clu000000000000000001",
    name: "Dongguan Electronics Cluster",
    slug: "dongguan-electronics",
  },
  contact: {
    email: "sales@example.com",
    phone: "+86 769 1234 5678",
    wechat: "factory-wechat",
    website: "https://factory.example.com/about",
  },
  employeeRange: "500–999",
  establishedYear: 2004,
  id: "fac000000000000000001",
  imageUrl: "https://cdn.example.com/factory-1.jpg",
  images: [
    {
      alt: "Factory exterior",
      url: "https://cdn.example.com/factory-1.jpg",
    },
    {
      alt: "Production line",
      url: "https://cdn.example.com/factory-2.jpg",
    },
  ],
  lastVerifiedAt: "2026-05-18T12:00:00Z",
  location: {
    coordinates: [113.777162, 22.770786],
    type: "Point",
  },
  mainProducts: ["Smartphones", "Smart devices"],
  moq: "1,000 units",
  name: "Dongguan Fixture Electronics Co., Ltd.",
  publishedAt: "2026-07-25T12:00:00Z",
  region: {
    id: "reg000000000000000001",
    level: "city",
    name: "Dongguan",
  },
  relatedFactories: [
    {
      cluster: {
        id: "clu000000000000000001",
        name: "Dongguan Electronics Cluster",
        slug: "dongguan-electronics",
      },
      id: "fac000000000000000002",
      imageUrl: null,
      location: {
        coordinates: [113.78, 22.78],
        type: "Point",
      },
      mainProducts: ["Electronic components"],
      name: "Related Components Factory",
      publishedAt: "2026-07-24T12:00:00Z",
      region: {
        id: "reg000000000000000001",
        level: "city",
        name: "Dongguan",
      },
      slug: "related-components-factory",
      verified: true,
    },
  ],
  slug: "dongguan-fixture-electronics",
  sourceName: "Official company website",
  sourceUrl: "https://factory.example.com/about",
  verified: true,
  verifiedAt: "2026-05-18T12:00:00Z",
};

const factoryResponse: GetFactory200 = {
  data: factory,
  error: null,
  meta: {},
};

const labels = {
  addressHeading: "Address",
  backToMap: "Back to the map",
  certifications: "Certifications",
  chineseAddress: "Chinese address",
  contactHeading: "Contact",
  detailsHeading: "Factory information",
  employeeRange: "Factory size",
  englishAddress: "English address",
  establishedYear: "Established",
  location: "Dongguan, China",
  locationHeading: "Factory location",
  mainProducts: "Main products",
  moq: "Minimum order quantity",
  navigationHeading: "Plan a visit",
  related: {
    heading: "Related factories",
    unverified: "Unverified",
    verified: "Verified",
    viewDetails: "View factory",
  },
  saveAction: {
    checking: "Checking account status.",
    error: "Save error.",
    retry: "Retry save",
    save: "Save factory",
    saved: "Saved",
    saving: "Saving…",
    signInHint: "Sign in to save this factory.",
  },
  source: "Source:",
  verificationLabel: "Verified 2026-05",
};

const messages = {
  FactoryDetail: {
    contact: {
      copied: "Copied",
      copyError: "Could not copy",
      copyWechat: "Copy WeChat ID",
      email: "Email",
      phone: "Phone",
      visitWebsite: "Visit official website",
      website: "Website",
      wechat: "WeChat",
    },
    copy: {
      action: "Copy",
      actionLabel: "Copy {label}",
      error: "Could not copy",
      success: "Copied",
    },
    gallery: {
      ariaLabel: "Images of {name}",
      chooseImage: "Choose a factory image",
      next: "Show next image",
      position: "Image {current} of {count}",
      previous: "Show previous image",
      showImage: "Show image {index}",
    },
    map: {
      ariaLabel: "Map preview of {name}",
      attributionLabel: "Map data attribution",
      error: "The map preview could not be loaded.",
      loading: "Loading map preview…",
      mapTilerLogoAlt: "MapTiler logo",
      retry: "Retry",
    },
    navigation: {
      providers: {
        amap: "Amap",
        apple: "Apple Maps",
        baidu: "Baidu Maps",
        google: "Google Maps",
      },
    },
  },
};

function renderFactoryContent(response: GetFactory200): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <FactoryDetailContent factoryResponse={response} labels={labels} />
    </NextIntlClientProvider>,
  );
}

function requireCallback(
  callback: (() => void) | null,
  label: string,
): () => void {
  if (callback === null) throw new Error(`${label} was not registered`);
  return callback;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("factory detail presentation", () => {
  it("renders complete SSR content, carousel, trust, contact, and related rail", () => {
    const markup = renderFactoryContent(factoryResponse);

    expect(markup).toContain(factory.name);
    expect(markup).toContain("Verified 2026-05");
    expect(markup).toContain("Official company website");
    expect(markup).toContain("Factory exterior");
    expect(markup).toContain("Image 1 of 2");
    expect(markup).toContain("ISO 9001");
    expect(markup).toContain("1,000 units");
    expect(markup).toContain("500–999");
    expect(markup).toContain(factory.address.en);
    expect(markup).toContain(factory.address.zh);
    expect(markup).toContain("sales@example.com");
    expect(markup).toContain("Google Maps");
    expect(markup).not.toContain("Apple Maps");
    expect(markup).toContain("Related Components Factory");
    expect(markup).toContain("Sign in to save this factory.");
  });

  it("hides every empty optional section and row", () => {
    const emptyFactory = {
      ...factory,
      certifications: [],
      contact: {},
      employeeRange: null,
      establishedYear: null,
      imageUrl: null,
      images: [],
      moq: null,
      relatedFactories: [],
      sourceName: null,
      sourceUrl: null,
      verified: false,
    };
    const markup = renderFactoryContent({
      ...factoryResponse,
      data: emptyFactory,
    });

    expect(markup).not.toContain(labels.certifications);
    expect(markup).not.toContain(labels.contactHeading);
    expect(markup).not.toContain(labels.employeeRange);
    expect(markup).not.toContain(labels.establishedYear);
    expect(markup).not.toContain(labels.moq);
    expect(markup).not.toContain(labels.related.heading);
    expect(markup).not.toContain("Images of");
    expect(markup).not.toContain(labels.source);
    expect(markup).toContain(labels.mainProducts);
    expect(markup).toContain(labels.addressHeading);
    expect(markup).toContain(labels.navigationHeading);
  });
});

describe("factory metadata and trust formatting", () => {
  it("emits canonical, English hreflang, description, and image metadata", () => {
    const metadata = buildFactoryMetadata(factory, {
      description: "Factory metadata description",
      imageAlt: "Factory cover",
      title: "Factory title",
    });

    expect(metadata.alternates).toEqual({
      canonical: "/factories/dongguan-fixture-electronics",
      languages: { en: "/factories/dongguan-fixture-electronics" },
    });
    expect(metadata.description).toBe("Factory metadata description");
    expect(metadata.openGraph).toMatchObject({
      images: [{ alt: "Factory cover", url: factory.imageUrl }],
      title: "Factory title",
      url: "/factories/dongguan-fixture-electronics",
    });
  });

  it("omits image metadata without an image and uses UTC YYYY-MM", () => {
    const metadata = buildFactoryMetadata(
      { ...factory, imageUrl: null },
      {
        description: "Factory metadata description",
        imageAlt: "unused",
        title: "Factory title",
      },
    );

    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(formatVerificationMonth(factory.lastVerifiedAt)).toBe("2026-05");
    expect(formatVerificationMonth(null)).toBeNull();
  });
});

describe("factory map, contact, and clipboard", () => {
  it("renders the WGS-84 map contract and required attribution immediately", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <FactoryLocationMap
          location={factory.location}
          name={factory.name}
          verified
        />
      </NextIntlClientProvider>,
    );

    expect(factory.location.coordinates).toEqual([113.777162, 22.770786]);
    expect(markup).toContain('data-coordinate-order="lng-lat"');
    expect(markup).toContain("Loading map preview…");
    expect(markup).toContain("© MapTiler");
    expect(markup).toContain("© OpenStreetMap contributors");
  });

  it("classifies non-empty contacts and rejects unsafe website protocols", () => {
    expect(hasFactoryContact(factory.contact)).toBe(true);
    expect(hasFactoryContact({})).toBe(false);
    expect(hasFactoryContact(null)).toBe(false);
    expect(safeWebsiteHref("https://factory.example.com")).toBe(
      "https://factory.example.com/",
    );
    expect(safeWebsiteHref("javascript:alert(1)")).toBeNull();
  });

  it("copies through the browser Clipboard API and rejects unavailable access", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await copyTextToClipboard(factory.address.zh);
    expect(writeText).toHaveBeenCalledWith(factory.address.zh);

    vi.stubGlobal("navigator", {});
    await expect(copyTextToClipboard(factory.address.en)).rejects.toThrow(
      "Clipboard API is unavailable",
    );
  });
});

describe("factory navigation", () => {
  it("builds the approved provider matrix and only exposes Apple on iOS", () => {
    const ios = buildFactoryNavigationOptions(
      factory.name,
      factory.location.coordinates,
      "ios",
    );
    const android = buildFactoryNavigationOptions(
      factory.name,
      factory.location.coordinates,
      "android",
    );
    const web = buildFactoryNavigationOptions(
      factory.name,
      factory.location.coordinates,
      "web",
    );

    expect(ios.map(({ provider }) => provider)).toEqual([
      "apple",
      "google",
      "amap",
      "baidu",
    ]);
    expect(android.map(({ provider }) => provider)).toEqual([
      "google",
      "amap",
      "baidu",
    ]);
    expect(web.map(({ provider }) => provider)).toEqual([
      "google",
      "amap",
      "baidu",
    ]);
    expect(ios.find(({ provider }) => provider === "amap")?.primaryUrl).toBe(
      buildNavUrl(
        {
          destinationName: factory.name,
          platform: "ios",
          provider: "amap",
        },
        factory.location.coordinates,
      ).app.url,
    );
    expect(web.find(({ provider }) => provider === "baidu")?.primaryUrl).toBe(
      buildNavUrl(
        {
          destinationName: factory.name,
          platform: "android",
          provider: "baidu",
        },
        factory.location.coordinates,
      ).webFallback.url,
    );
  });

  it("detects Android, iOS, iPad desktop mode, and web platforms", () => {
    expect(detectFactoryNavigationPlatform("Android 16", 5)).toBe("android");
    expect(
      detectFactoryNavigationPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS)", 5),
    ).toBe("ios");
    expect(detectFactoryNavigationPlatform("Mozilla/5.0 (Macintosh)", 5)).toBe(
      "ios",
    );
    expect(
      detectFactoryNavigationPlatform("Mozilla/5.0 (Windows NT 10.0)", 0),
    ).toBe("web");
  });

  it("attempts the app URI, falls back after 1.5s, and cancels when hidden", () => {
    const navigations: string[] = [];
    let scheduled: (() => void) | null = null;
    let visibilityListener: (() => void) | null = null;
    let visible = true;
    const runtime: NavigationLaunchRuntime = {
      addPageHideListener: vi.fn(),
      addVisibilityListener(listener) {
        visibilityListener = listener;
      },
      clearTimeout: vi.fn(),
      isVisible: () => visible,
      navigate: (url) => navigations.push(url),
      removePageHideListener: vi.fn(),
      removeVisibilityListener: vi.fn(),
      setTimeout(callback, delay) {
        expect(delay).toBe(NAVIGATION_FALLBACK_DELAY_MS);
        scheduled = callback;
        return 42;
      },
    };
    const option = buildFactoryNavigationOptions(
      factory.name,
      factory.location.coordinates,
      "ios",
    ).find(({ provider }) => provider === "amap")!;

    launchAppWithFallback(option, runtime);
    expect(navigations).toEqual([option.primaryUrl]);
    expect(scheduled).not.toBeNull();
    requireCallback(scheduled, "fallback timer")();
    expect(navigations).toEqual([option.primaryUrl, option.fallbackUrl]);

    navigations.length = 0;
    launchAppWithFallback(option, runtime);
    visible = false;
    expect(visibilityListener).not.toBeNull();
    requireCallback(visibilityListener, "visibility listener")();
    expect(navigations).toEqual([option.primaryUrl]);
  });
});

describe("factory request failure classification", () => {
  it("maps invalid or unpublished slugs to not-found and rethrows outages", () => {
    expect(isMissingFactoryResponse({ status: 400 })).toBe(true);
    expect(isMissingFactoryResponse({ status: 404 })).toBe(true);
    expect(isMissingFactoryResponse({ status: 500 })).toBe(false);
    expect(isMissingFactoryResponse(new Error("offline"))).toBe(false);
  });

  it("keeps the not-found decision outside a route-level streaming boundary", () => {
    expect(
      existsSync(
        new URL(
          "../app/(frontend)/factories/[slug]/loading.tsx",
          import.meta.url,
        ),
      ),
    ).toBe(false);
  });
});

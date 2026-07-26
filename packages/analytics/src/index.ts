const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_CANDIDATE_PATTERN =
  /(?<![\p{L}\p{N}])\+?\d[\d\s().-]{5,}\d(?![\p{L}\p{N}])/gu;
const REDACTED_VALUE = "[redacted]";
const SEARCH_QUERY_LIMIT = 100;

export const MAP_MOVED_THROTTLE_MS = 10_000;

export type AnalyticsConsent = "denied" | "granted" | "unknown";

export type SearchPerformedProperties = {
  query: string;
  resultCount: number;
};

export type SearchPerformedInput = Readonly<SearchPerformedProperties>;

export type ClusterViewedProperties = {
  clusterId: string;
  slug: string;
};

export type ClusterViewedInput = Readonly<ClusterViewedProperties>;

export type FactoryViewedProperties = {
  factoryId: string;
  slug: string;
};

export type FactoryViewedInput = Readonly<FactoryViewedProperties>;

export type FactoryContactMethod = "email" | "phone" | "wechat" | "website";

export type FactoryContactClickedProperties = {
  factoryId: string;
  method: FactoryContactMethod;
  slug: string;
};

export type FactoryContactClickedInput =
  Readonly<FactoryContactClickedProperties>;

export type NavigationProvider = "amap" | "apple" | "baidu" | "google";
export type NavigationPlatform = "android" | "ios" | "web";

export type NavigationClickedProperties = {
  factoryId: string;
  platform: NavigationPlatform;
  provider: NavigationProvider;
  slug: string;
};

export type NavigationClickedInput = Readonly<NavigationClickedProperties>;

export type MapMovedProperties = {
  bbox: string;
  categorySlug: string | null;
  zoom: number;
};

export type MapMovedInput = Readonly<MapMovedProperties>;

export interface AnalyticsCapture {
  (event: "search_performed", properties: SearchPerformedProperties): void;
  (event: "cluster_viewed", properties: ClusterViewedProperties): void;
  (event: "factory_viewed", properties: FactoryViewedProperties): void;
  (
    event: "factory_contact_clicked",
    properties: FactoryContactClickedProperties,
  ): void;
  (event: "navigation_clicked", properties: NavigationClickedProperties): void;
  (event: "map_moved", properties: MapMovedProperties): void;
}

export interface AnalyticsClient {
  configureCapture(capture: AnalyticsCapture | null): void;
  getConsent(): AnalyticsConsent;
  setConsent(consent: AnalyticsConsent): void;
  subscribe(listener: () => void): () => void;
  trackClusterViewed(input: ClusterViewedInput): void;
  trackFactoryContactClicked(input: FactoryContactClickedInput): void;
  trackFactoryViewed(input: FactoryViewedInput): void;
  trackMapMoved(input: MapMovedInput): void;
  trackNavigationClicked(input: NavigationClickedInput): void;
  trackSearchPerformed(input: SearchPerformedInput): void;
}

export interface AnalyticsClientOptions {
  now?: () => number;
}

function redactPhoneCandidate(candidate: string): string {
  const digitCount = candidate.replace(/\D/gu, "").length;
  return digitCount >= 7 ? REDACTED_VALUE : candidate;
}

export function sanitizeSearchQuery(query: string): string {
  const sanitized = query
    .replace(EMAIL_PATTERN, REDACTED_VALUE)
    .replace(PHONE_CANDIDATE_PATTERN, redactPhoneCandidate)
    .replace(/\s+/gu, " ")
    .trim();

  return Array.from(sanitized).slice(0, SEARCH_QUERY_LIMIT).join("");
}

function normalizeResultCount(resultCount: number): number {
  if (!Number.isFinite(resultCount)) return 0;
  return Math.max(0, Math.trunc(resultCount));
}

function normalizeZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 0;
  return Math.min(24, Math.max(0, Math.trunc(zoom)));
}

function safelyCapture(captureEvent: () => void): boolean {
  try {
    captureEvent();
    return true;
  } catch {
    return false;
  }
}

export function createAnalyticsClient({
  now = Date.now,
}: AnalyticsClientOptions = {}): AnalyticsClient {
  let capture: AnalyticsCapture | null = null;
  let consent: AnalyticsConsent = "unknown";
  let lastMapMovedAt: number | null = null;
  const listeners = new Set<() => void>();

  const canCapture = () => consent === "granted" && capture !== null;

  return {
    configureCapture(nextCapture) {
      capture = nextCapture;
    },
    getConsent() {
      return consent;
    },
    setConsent(nextConsent) {
      if (consent === nextConsent) return;

      consent = nextConsent;
      if (nextConsent !== "granted") lastMapMovedAt = null;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    trackClusterViewed({ clusterId, slug }) {
      if (!canCapture()) return;

      safelyCapture(() => capture?.("cluster_viewed", { clusterId, slug }));
    },
    trackFactoryContactClicked({ factoryId, method, slug }) {
      if (!canCapture()) return;

      safelyCapture(() =>
        capture?.("factory_contact_clicked", { factoryId, method, slug }),
      );
    },
    trackFactoryViewed({ factoryId, slug }) {
      if (!canCapture()) return;

      safelyCapture(() => capture?.("factory_viewed", { factoryId, slug }));
    },
    trackMapMoved({ bbox, categorySlug, zoom }) {
      if (!canCapture()) return;

      const capturedAt = now();
      if (
        lastMapMovedAt !== null &&
        capturedAt - lastMapMovedAt < MAP_MOVED_THROTTLE_MS
      ) {
        return;
      }

      const captured = safelyCapture(() =>
        capture?.("map_moved", {
          bbox: bbox.trim(),
          categorySlug,
          zoom: normalizeZoom(zoom),
        }),
      );
      if (captured) lastMapMovedAt = capturedAt;
    },
    trackNavigationClicked({ factoryId, platform, provider, slug }) {
      if (!canCapture()) return;

      safelyCapture(() =>
        capture?.("navigation_clicked", {
          factoryId,
          platform,
          provider,
          slug,
        }),
      );
    },
    trackSearchPerformed({ query, resultCount }) {
      if (!canCapture()) return;

      safelyCapture(() =>
        capture?.("search_performed", {
          query: sanitizeSearchQuery(query),
          resultCount: normalizeResultCount(resultCount),
        }),
      );
    },
  };
}

export const analytics = createAnalyticsClient();

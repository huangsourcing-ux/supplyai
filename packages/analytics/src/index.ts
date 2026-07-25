const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_CANDIDATE_PATTERN =
  /(?<![\p{L}\p{N}])\+?\d[\d\s().-]{5,}\d(?![\p{L}\p{N}])/gu;
const REDACTED_VALUE = "[redacted]";
const SEARCH_QUERY_LIMIT = 100;

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

export interface AnalyticsCapture {
  (event: "search_performed", properties: SearchPerformedProperties): void;
  (event: "cluster_viewed", properties: ClusterViewedProperties): void;
}

export interface AnalyticsClient {
  configureCapture(capture: AnalyticsCapture | null): void;
  getConsent(): AnalyticsConsent;
  setConsent(consent: AnalyticsConsent): void;
  trackClusterViewed(input: ClusterViewedInput): void;
  trackSearchPerformed(input: SearchPerformedInput): void;
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

export function createAnalyticsClient(): AnalyticsClient {
  let capture: AnalyticsCapture | null = null;
  let consent: AnalyticsConsent = "unknown";

  return {
    configureCapture(nextCapture) {
      capture = nextCapture;
    },
    getConsent() {
      return consent;
    },
    setConsent(nextConsent) {
      consent = nextConsent;
    },
    trackClusterViewed({ clusterId, slug }) {
      if (consent !== "granted" || capture === null) return;

      capture("cluster_viewed", { clusterId, slug });
    },
    trackSearchPerformed({ query, resultCount }) {
      if (consent !== "granted" || capture === null) return;

      capture("search_performed", {
        query: sanitizeSearchQuery(query),
        resultCount: normalizeResultCount(resultCount),
      });
    },
  };
}

export const analytics = createAnalyticsClient();

import {
  analytics,
  type AnalyticsClient,
  type AnalyticsConsent,
} from "@chinasupply/analytics";

import type { WebAnalyticsAdapter } from "./posthog-adapter";

export const ANALYTICS_CONSENT_STORAGE_KEY = "chinasupply.analytics-consent.v1";

export type StoredAnalyticsConsent = Exclude<AnalyticsConsent, "unknown">;

export interface AnalyticsConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AnalyticsConsentSnapshot {
  choice: AnalyticsConsent;
  eligible: boolean;
  initialized: boolean;
  panelOpen: boolean;
  ready: boolean;
}

export interface AnalyticsConsentManager {
  allow(): void;
  closePanel(): void;
  deny(): void;
  getSnapshot(): AnalyticsConsentSnapshot;
  handleStoredValue(value: string | null): void;
  initialize(storage: AnalyticsConsentStorage | null): void;
  openPanel(): void;
  setEligible(eligible: boolean): void;
  subscribe(listener: () => void): () => void;
}

export interface AnalyticsConsentManagerOptions {
  analyticsClient?: AnalyticsClient;
  loadAdapter: () => Promise<WebAnalyticsAdapter>;
}

const INITIAL_SNAPSHOT: AnalyticsConsentSnapshot = {
  choice: "unknown",
  eligible: false,
  initialized: false,
  panelOpen: false,
  ready: false,
};

export function parseStoredAnalyticsConsent(
  value: string | null,
): AnalyticsConsent {
  return value === "granted" || value === "denied" ? value : "unknown";
}

export function isAnalyticsEligiblePath(pathname: string | null): boolean {
  if (pathname === null) return false;

  return !["/admin", "/ops", "/sign-in"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function readStoredConsent(
  storage: AnalyticsConsentStorage | null,
): AnalyticsConsent {
  if (storage === null) return "unknown";

  try {
    return parseStoredAnalyticsConsent(
      storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY),
    );
  } catch {
    return "unknown";
  }
}

function persistConsent(
  storage: AnalyticsConsentStorage | null,
  consent: StoredAnalyticsConsent,
): void {
  if (storage === null) return;

  try {
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // A blocked storage API makes the choice session-only and must not block UI.
  }
}

export function createAnalyticsConsentManager({
  analyticsClient = analytics,
  loadAdapter,
}: AnalyticsConsentManagerOptions): AnalyticsConsentManager {
  let snapshot = INITIAL_SNAPSHOT;
  let storage: AnalyticsConsentStorage | null = null;
  let adapter: WebAnalyticsAdapter | null = null;
  let adapterPromise: Promise<WebAnalyticsAdapter> | null = null;
  const listeners = new Set<() => void>();

  const updateSnapshot = (next: Partial<AnalyticsConsentSnapshot>): void => {
    const candidate = { ...snapshot, ...next };
    if (
      candidate.choice === snapshot.choice &&
      candidate.eligible === snapshot.eligible &&
      candidate.initialized === snapshot.initialized &&
      candidate.panelOpen === snapshot.panelOpen &&
      candidate.ready === snapshot.ready
    ) {
      return;
    }

    snapshot = candidate;
    for (const listener of listeners) listener();
  };

  const disableCapture = (consent: AnalyticsConsent): void => {
    analyticsClient.configureCapture(null);
    if (consent !== "granted") {
      try {
        adapter?.optOut();
      } catch {
        // Consent withdrawal must still disconnect the application facade.
      }
    }
    analyticsClient.setConsent(consent);
    updateSnapshot({ ready: false });
  };

  const activateAdapter = (nextAdapter: WebAnalyticsAdapter): void => {
    try {
      nextAdapter.optIn();
      analyticsClient.configureCapture(nextAdapter.capture);
      analyticsClient.setConsent("granted");
      updateSnapshot({ ready: true });
    } catch {
      analyticsClient.configureCapture(null);
      analyticsClient.setConsent("unknown");
      updateSnapshot({ ready: false });
    }
  };

  const ensureAdapter = (): void => {
    if (!snapshot.eligible || snapshot.choice !== "granted") return;

    if (adapter !== null) {
      activateAdapter(adapter);
      return;
    }
    if (adapterPromise !== null) return;

    analyticsClient.configureCapture(null);
    analyticsClient.setConsent("unknown");
    adapterPromise = Promise.resolve().then(loadAdapter);
    void adapterPromise
      .then((loadedAdapter) => {
        adapter = loadedAdapter;
        adapterPromise = null;
        if (snapshot.choice === "granted" && snapshot.eligible) {
          activateAdapter(loadedAdapter);
          return;
        }

        try {
          loadedAdapter.optOut();
        } catch {
          // The shared facade is already disconnected; remain fail-closed.
        }
      })
      .catch(() => {
        adapterPromise = null;
        analyticsClient.configureCapture(null);
        analyticsClient.setConsent("unknown");
        updateSnapshot({ ready: false });
      });
  };

  const applyChoice = (choice: AnalyticsConsent): void => {
    updateSnapshot({
      choice,
      panelOpen: choice === "unknown",
      ready: false,
    });

    if (choice === "granted") {
      ensureAdapter();
      return;
    }
    disableCapture(choice);
  };

  return {
    allow() {
      persistConsent(storage, "granted");
      updateSnapshot({ choice: "granted", panelOpen: false, ready: false });
      ensureAdapter();
    },
    closePanel() {
      if (snapshot.choice === "unknown") return;
      updateSnapshot({ panelOpen: false });
    },
    deny() {
      persistConsent(storage, "denied");
      updateSnapshot({ choice: "denied", panelOpen: false, ready: false });
      disableCapture("denied");
    },
    getSnapshot() {
      return snapshot;
    },
    handleStoredValue(value) {
      applyChoice(parseStoredAnalyticsConsent(value));
    },
    initialize(nextStorage) {
      if (snapshot.initialized) return;

      storage = nextStorage;
      const storedConsent = readStoredConsent(storage);
      updateSnapshot({
        choice: storedConsent,
        initialized: true,
        panelOpen: storedConsent === "unknown",
      });
      applyChoice(storedConsent);
    },
    openPanel() {
      updateSnapshot({ panelOpen: true });
    },
    setEligible(eligible) {
      updateSnapshot({ eligible });
      if (eligible) {
        ensureAdapter();
        return;
      }

      disableCapture(snapshot.choice === "denied" ? "denied" : "unknown");
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

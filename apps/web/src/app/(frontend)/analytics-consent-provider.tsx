"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, {
  createContext,
  type KeyboardEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  createAnalyticsConsentManager,
  isAnalyticsEligiblePath,
} from "@/analytics/analytics-consent";
import { loadPostHogAdapter } from "@/analytics/posthog-adapter";
import { PUBLIC_PRIVACY_PATH } from "@/legal/legal-routes";

import styles from "./analytics-consent.module.css";

export const ANALYTICS_CONSENT_PANEL_ID = "analytics-consent-panel";

export interface AnalyticsConsentLabels {
  allow: string;
  allowedStatus: string;
  close: string;
  deniedStatus: string;
  description: string;
  privacyLink: string;
  reject: string;
  title: string;
}

interface AnalyticsSettingsContextValue {
  open: boolean;
  openSettings(): void;
}

const AnalyticsSettingsContext = createContext<AnalyticsSettingsContextValue>({
  open: false,
  openSettings: () => undefined,
});

export function useAnalyticsSettings(): AnalyticsSettingsContextValue {
  return useContext(AnalyticsSettingsContext);
}

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function AnalyticsConsentProvider({
  children,
  labels,
}: Readonly<{
  children: React.ReactNode;
  labels: AnalyticsConsentLabels;
}>) {
  const pathname = usePathname();
  const [manager] = useState(() =>
    createAnalyticsConsentManager({ loadAdapter: loadPostHogAdapter }),
  );
  const snapshot = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelWasOpenRef = useRef(false);
  const eligible = isAnalyticsEligiblePath(pathname);

  useEffect(() => {
    manager.setEligible(eligible);
  }, [eligible, manager]);

  useEffect(() => {
    manager.initialize(getBrowserStorage());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ANALYTICS_CONSENT_STORAGE_KEY) {
        manager.handleStoredValue(event.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [manager]);

  useEffect(() => {
    if (
      snapshot.panelOpen &&
      !panelWasOpenRef.current &&
      snapshot.choice !== "unknown"
    ) {
      headingRef.current?.focus();
    }
    panelWasOpenRef.current = snapshot.panelOpen;
  }, [snapshot.choice, snapshot.panelOpen]);

  const contextValue = useMemo(
    () => ({
      open: eligible && snapshot.panelOpen,
      openSettings: manager.openPanel,
    }),
    [eligible, manager.openPanel, snapshot.panelOpen],
  );
  const panelVisible = eligible && snapshot.initialized && snapshot.panelOpen;
  const status =
    snapshot.choice === "granted"
      ? labels.allowedStatus
      : snapshot.choice === "denied"
        ? labels.deniedStatus
        : null;

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && snapshot.choice !== "unknown") {
      manager.closePanel();
    }
  };

  return (
    <AnalyticsSettingsContext.Provider value={contextValue}>
      {children}
      {panelVisible ? (
        <section
          aria-labelledby="analytics-consent-title"
          className={styles.panel}
          id={ANALYTICS_CONSENT_PANEL_ID}
          onKeyDown={handlePanelKeyDown}
        >
          {snapshot.choice === "unknown" ? null : (
            <button
              aria-label={labels.close}
              className={styles.close}
              onClick={manager.closePanel}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
          <div className={styles.copy}>
            <h2 id="analytics-consent-title" ref={headingRef} tabIndex={-1}>
              {labels.title}
            </h2>
            <p>{labels.description}</p>
            <p className={styles.policy}>
              <Link href={PUBLIC_PRIVACY_PATH}>{labels.privacyLink}</Link>
            </p>
            {status === null ? null : (
              <p aria-live="polite" className={styles.status}>
                {status}
              </p>
            )}
          </div>
          <div className={styles.actions}>
            <button
              className={styles.choice}
              onClick={manager.deny}
              type="button"
            >
              {labels.reject}
            </button>
            <button
              className={styles.choice}
              onClick={manager.allow}
              type="button"
            >
              {labels.allow}
            </button>
          </div>
        </section>
      ) : null}
    </AnalyticsSettingsContext.Provider>
  );
}

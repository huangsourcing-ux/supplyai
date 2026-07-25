"use client";

import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useSyncExternalStore } from "react";

import { analytics, type NavigationProvider } from "@chinasupply/analytics";

import styles from "./factory-detail.module.css";
import {
  buildFactoryNavigationOptions,
  detectFactoryNavigationPlatform,
  launchAppWithFallback,
  type FactoryNavigationOption,
  type FactoryNavigationPlatform,
  type NavigationLaunchRuntime,
} from "./factory-navigation";

function createBrowserNavigationRuntime(): NavigationLaunchRuntime {
  return {
    addPageHideListener(listener) {
      window.addEventListener("pagehide", listener);
    },
    addVisibilityListener(listener) {
      document.addEventListener("visibilitychange", listener);
    },
    clearTimeout(timerId) {
      window.clearTimeout(timerId);
    },
    isVisible() {
      return document.visibilityState === "visible";
    },
    navigate(url) {
      window.location.assign(url);
    },
    removePageHideListener(listener) {
      window.removeEventListener("pagehide", listener);
    },
    removeVisibilityListener(listener) {
      document.removeEventListener("visibilitychange", listener);
    },
    setTimeout(callback, delay) {
      return window.setTimeout(callback, delay);
    },
  };
}

function subscribeToPlatform(): () => void {
  return () => undefined;
}

function getBrowserPlatform(): FactoryNavigationPlatform {
  return detectFactoryNavigationPlatform(
    window.navigator.userAgent,
    window.navigator.maxTouchPoints,
  );
}

function getServerPlatform(): FactoryNavigationPlatform {
  return "web";
}

export function FactoryNavigationButtons({
  factoryId,
  name,
  position,
  slug,
}: Readonly<{
  factoryId: string;
  name: string;
  position: readonly [number, number];
  slug: string;
}>) {
  const translate = useTranslations("FactoryDetail.navigation");
  const platform = useSyncExternalStore(
    subscribeToPlatform,
    getBrowserPlatform,
    getServerPlatform,
  );
  const activeLaunchCleanup = useRef<(() => void) | null>(null);
  const options = buildFactoryNavigationOptions(name, position, platform);

  useEffect(
    () => () => {
      activeLaunchCleanup.current?.();
    },
    [],
  );

  const track = (provider: NavigationProvider) => {
    analytics.trackNavigationClicked({
      factoryId,
      platform,
      provider,
      slug,
    });
  };

  const openApp = (option: FactoryNavigationOption) => {
    activeLaunchCleanup.current?.();
    track(option.provider);
    activeLaunchCleanup.current = launchAppWithFallback(
      option,
      createBrowserNavigationRuntime(),
    );
  };

  return (
    <div className={styles.navigationButtons}>
      {options.map((option) =>
        option.appFirst ? (
          <button
            key={option.provider}
            onClick={() => openApp(option)}
            type="button"
          >
            {translate(`providers.${option.provider}`)}
          </button>
        ) : (
          <a
            href={option.primaryUrl}
            key={option.provider}
            onClick={() => track(option.provider)}
            rel="noreferrer"
            target="_blank"
          >
            {translate(`providers.${option.provider}`)}
          </a>
        ),
      )}
    </div>
  );
}

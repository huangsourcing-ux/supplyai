import {
  buildNavUrl,
  type NavigationProvider,
  type NavigationTarget,
} from "@chinasupply/geo/navigation";

export type FactoryNavigationPlatform = "android" | "ios" | "web";

export interface FactoryNavigationOption {
  appFirst: boolean;
  fallbackUrl: string;
  primaryUrl: string;
  provider: NavigationProvider;
}

export interface NavigationLaunchRuntime {
  addPageHideListener(listener: () => void): void;
  addVisibilityListener(listener: () => void): void;
  clearTimeout(timerId: number): void;
  isVisible(): boolean;
  navigate(url: string): void;
  removePageHideListener(listener: () => void): void;
  removeVisibilityListener(listener: () => void): void;
  setTimeout(callback: () => void, delay: number): number;
}

export const NAVIGATION_FALLBACK_DELAY_MS = 1_500;

function buildMobileOption(
  target: NavigationTarget,
  position: readonly [number, number],
): FactoryNavigationOption {
  const links = buildNavUrl(target, position);

  return {
    appFirst: target.provider === "amap" || target.provider === "baidu",
    fallbackUrl: links.webFallback.url,
    primaryUrl: links.app.url,
    provider: target.provider,
  };
}

function buildWebOption(
  provider: Exclude<NavigationProvider, "apple">,
  destinationName: string,
  position: readonly [number, number],
): FactoryNavigationOption {
  const links = buildNavUrl(
    { destinationName, platform: "android", provider },
    position,
  );

  return {
    appFirst: false,
    fallbackUrl: links.webFallback.url,
    primaryUrl: links.webFallback.url,
    provider,
  };
}

export function buildFactoryNavigationOptions(
  destinationName: string,
  position: readonly [number, number],
  platform: FactoryNavigationPlatform,
): FactoryNavigationOption[] {
  if (platform === "web") {
    return (["google", "amap", "baidu"] as const).map((provider) =>
      buildWebOption(provider, destinationName, position),
    );
  }

  const targets: NavigationTarget[] =
    platform === "ios"
      ? [
          { destinationName, platform, provider: "apple" },
          { destinationName, platform, provider: "google" },
          { destinationName, platform, provider: "amap" },
          { destinationName, platform, provider: "baidu" },
        ]
      : [
          { destinationName, platform, provider: "google" },
          { destinationName, platform, provider: "amap" },
          { destinationName, platform, provider: "baidu" },
        ];

  return targets.map((target) => buildMobileOption(target, position));
}

export function detectFactoryNavigationPlatform(
  userAgent: string,
  maxTouchPoints: number,
): FactoryNavigationPlatform {
  if (/Android/iu.test(userAgent)) return "android";
  if (
    /iPad|iPhone|iPod/iu.test(userAgent) ||
    (/Macintosh/iu.test(userAgent) && maxTouchPoints > 1)
  ) {
    return "ios";
  }
  return "web";
}

export function launchAppWithFallback(
  option: FactoryNavigationOption,
  runtime: NavigationLaunchRuntime,
): () => void {
  let timerId: number | null = null;

  const cleanup = () => {
    if (timerId !== null) runtime.clearTimeout(timerId);
    timerId = null;
    runtime.removePageHideListener(cancelFallback);
    runtime.removeVisibilityListener(handleVisibilityChange);
  };
  const cancelFallback = () => {
    cleanup();
  };
  const handleVisibilityChange = () => {
    if (!runtime.isVisible()) cancelFallback();
  };

  runtime.addPageHideListener(cancelFallback);
  runtime.addVisibilityListener(handleVisibilityChange);
  timerId = runtime.setTimeout(() => {
    cleanup();
    if (runtime.isVisible()) runtime.navigate(option.fallbackUrl);
  }, NAVIGATION_FALLBACK_DELAY_MS);

  try {
    runtime.navigate(option.primaryUrl);
  } catch {
    cleanup();
    runtime.navigate(option.fallbackUrl);
  }

  return cleanup;
}

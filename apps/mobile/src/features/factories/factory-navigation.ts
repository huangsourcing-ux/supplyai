import {
  buildNavUrl,
  type NavigationProvider,
  type NavigationTarget,
} from "@chinasupply/geo/navigation";

export type MobileFactoryNavigationPlatform = "android" | "ios";

export interface MobileFactoryNavigationOption {
  fallbackUrl: string;
  primaryUrl: string;
  provider: NavigationProvider;
}

export type OpenNavigationUrl = (url: string) => Promise<unknown>;

export function buildMobileFactoryNavigationOptions(
  destinationName: string,
  position: readonly [number, number],
  platform: MobileFactoryNavigationPlatform,
): MobileFactoryNavigationOption[] {
  const targets: NavigationTarget[] =
    platform === "ios"
      ? [
          { destinationName, platform, provider: "google" },
          { destinationName, platform, provider: "apple" },
          { destinationName, platform, provider: "amap" },
          { destinationName, platform, provider: "baidu" },
        ]
      : [
          { destinationName, platform, provider: "google" },
          { destinationName, platform, provider: "amap" },
          { destinationName, platform, provider: "baidu" },
        ];

  return targets.map((target) => {
    const links = buildNavUrl(target, position);

    return {
      fallbackUrl: links.webFallback.url,
      primaryUrl: links.app.url,
      provider: target.provider,
    };
  });
}

export async function openMobileFactoryNavigation(
  option: Readonly<MobileFactoryNavigationOption>,
  openUrl: OpenNavigationUrl,
): Promise<"fallback" | "primary"> {
  try {
    await openUrl(option.primaryUrl);
    return "primary";
  } catch (primaryError) {
    if (option.primaryUrl === option.fallbackUrl) throw primaryError;

    await openUrl(option.fallbackUrl);
    return "fallback";
  }
}

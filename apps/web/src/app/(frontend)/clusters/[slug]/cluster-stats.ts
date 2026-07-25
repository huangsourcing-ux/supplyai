import type { GetCluster200DataStats } from "@chinasupply/api-client";

export interface FormattedClusterStats {
  annualOutput: string | null;
  exportShare: string | null;
}

export function formatClusterFactoryCount(
  factoryCount: number,
  locale: string,
): string {
  return new Intl.NumberFormat(locale).format(factoryCount);
}

export function formatClusterStats(
  stats: GetCluster200DataStats,
  locale: string,
): FormattedClusterStats {
  return {
    annualOutput:
      stats?.annualOutputUsd === undefined
        ? null
        : new Intl.NumberFormat(locale, {
            compactDisplay: "short",
            currency: "USD",
            maximumFractionDigits: 1,
            notation: "compact",
            style: "currency",
          }).format(stats.annualOutputUsd),
    exportShare:
      stats?.exportShare === undefined
        ? null
        : new Intl.NumberFormat(locale, {
            maximumFractionDigits: 1,
            style: "percent",
          }).format(stats.exportShare),
  };
}

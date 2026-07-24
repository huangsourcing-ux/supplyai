export interface ApiClientConfiguration {
  baseUrl: string;
}

let configuredApiOrigin: string | undefined;

export function configureApiClient({ baseUrl }: ApiClientConfiguration): void {
  const url = new URL(baseUrl);
  const normalizedPath = url.pathname.replace(/\/+$/, "");

  if (!normalizedPath.endsWith("/api/v1")) {
    throw new Error("API base URL must end with /api/v1");
  }

  url.pathname = normalizedPath.slice(0, -"/api/v1".length) || "/";
  url.search = "";
  url.hash = "";
  configuredApiOrigin = url.toString().replace(/\/+$/, "");
}

export function getApiOrigin(): string {
  if (configuredApiOrigin === undefined) {
    throw new Error(
      "API client is not configured. Call configureApiClient({ baseUrl }) first.",
    );
  }

  return configuredApiOrigin;
}

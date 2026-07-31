import { coordinateSchema } from "@chinasupply/schemas";
import { z } from "zod";

export interface AmapGeocodingConfig {
  AMAP_WEB_SERVICE_KEY?: string;
  AMAP_GEOCODING_BASE_URL: string;
}

export interface AmapGeocodeResult {
  candidateCount: number;
  formattedAddress: string | null;
  matchLevel: string | null;
  locationGcj02: { lng: number; lat: number };
}

export class AmapGeocodingRowError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AmapGeocodingRowError";
  }
}

export class AmapGeocodingFatalError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AmapGeocodingFatalError";
  }
}

class AmapGeocodingTransientError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "AmapGeocodingTransientError";
  }
}

const amapGeocodeSchema = z
  .object({
    formatted_address: z.unknown().optional(),
    level: z.unknown().optional(),
    location: z.string().trim().min(1),
  })
  .passthrough();

const amapCountSchema = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform(Number);
const amapInfoCodeSchema = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform(String);

const amapResponseSchema = z
  .object({
    status: z.union([z.literal("0"), z.literal("1")]),
    count: amapCountSchema,
    info: z.string().optional(),
    infocode: amapInfoCodeSchema,
    geocodes: z.array(amapGeocodeSchema).optional().default([]),
  })
  .passthrough();

const ROW_ERROR_CODES = new Set(["20000", "20001", "20012"]);
const TRANSIENT_ERROR_CODES = new Set([
  "10004",
  "10014",
  "10015",
  "10016",
  "10017",
  "10019",
  "10020",
  "10021",
]);
const REQUEST_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [250, 500] as const;

type FetchImplementation = typeof fetch;
type DelayImplementation = (milliseconds: number) => Promise<void>;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function providerText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isTransientProviderCode(code: string): boolean {
  return TRANSIENT_ERROR_CODES.has(code) || code.startsWith("3");
}

function parseLocation(location: string): { lng: number; lat: number } {
  const parts = location.split(",");
  if (parts.length !== 2) {
    throw new AmapGeocodingFatalError(
      "AMAP_INVALID_RESPONSE",
      "Amap returned an invalid geocoding response",
    );
  }

  const result = coordinateSchema.safeParse({
    lng: Number(parts[0]),
    lat: Number(parts[1]),
  });
  if (!result.success) {
    throw new AmapGeocodingFatalError(
      "AMAP_INVALID_RESPONSE",
      "Amap returned an invalid geocoding response",
    );
  }
  return result.data;
}

export class AmapGeocodingClient {
  constructor(
    private readonly config: AmapGeocodingConfig,
    private readonly fetchImplementation: FetchImplementation = fetch,
    private readonly delayImplementation: DelayImplementation = delay,
  ) {}

  async geocode(address: string): Promise<AmapGeocodeResult> {
    if (this.config.AMAP_WEB_SERVICE_KEY === undefined) {
      throw new AmapGeocodingFatalError(
        "AMAP_NOT_CONFIGURED",
        "Amap Web Service key is not configured",
      );
    }

    for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt += 1) {
      try {
        return await this.request(address);
      } catch (error) {
        if (
          error instanceof AmapGeocodingRowError ||
          error instanceof AmapGeocodingFatalError
        ) {
          throw error;
        }

        const canRetry = attempt < REQUEST_ATTEMPTS - 1;
        if (!canRetry) {
          throw new AmapGeocodingFatalError(
            error instanceof AmapGeocodingTransientError
              ? error.code
              : "AMAP_NETWORK_ERROR",
            "Amap geocoding failed after 3 attempts",
          );
        }

        await this.delayImplementation(RETRY_DELAYS_MS[attempt] ?? 500);
      }
    }

    throw new AmapGeocodingFatalError(
      "AMAP_NETWORK_ERROR",
      "Amap geocoding failed after 3 attempts",
    );
  }

  private async request(address: string): Promise<AmapGeocodeResult> {
    const url = new URL(this.config.AMAP_GEOCODING_BASE_URL);
    url.searchParams.set("key", this.config.AMAP_WEB_SERVICE_KEY!);
    url.searchParams.set("address", address);
    url.searchParams.set("output", "JSON");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;

    try {
      response = await this.fetchImplementation(url, {
        headers: { Accept: "application/json" },
        method: "GET",
        signal: controller.signal,
      });
    } catch {
      throw new AmapGeocodingTransientError("AMAP_NETWORK_ERROR");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        throw new AmapGeocodingTransientError(`AMAP_HTTP_${response.status}`);
      }
      throw new AmapGeocodingFatalError(
        `AMAP_HTTP_${response.status}`,
        `Amap geocoding returned HTTP ${response.status}`,
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(await response.text()) as unknown;
    } catch {
      throw new AmapGeocodingFatalError(
        "AMAP_INVALID_RESPONSE",
        "Amap returned an invalid geocoding response",
      );
    }

    const parsed = amapResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AmapGeocodingFatalError(
        "AMAP_INVALID_RESPONSE",
        "Amap returned an invalid geocoding response",
      );
    }

    if (parsed.data.status === "0") {
      if (ROW_ERROR_CODES.has(parsed.data.infocode)) {
        throw new AmapGeocodingRowError(
          parsed.data.infocode,
          `Amap rejected the address (${parsed.data.infocode})`,
        );
      }
      if (isTransientProviderCode(parsed.data.infocode)) {
        throw new AmapGeocodingTransientError(parsed.data.infocode);
      }
      throw new AmapGeocodingFatalError(
        parsed.data.infocode,
        `Amap geocoding failed (${parsed.data.infocode})`,
      );
    }

    const first = parsed.data.geocodes[0];
    if (parsed.data.count === 0 || first === undefined) {
      throw new AmapGeocodingRowError(
        "AMAP_NO_RESULTS",
        "Amap returned no geocoding result",
      );
    }

    return {
      candidateCount: parsed.data.count,
      formattedAddress: providerText(first.formatted_address),
      matchLevel: providerText(first.level),
      locationGcj02: parseLocation(first.location),
    };
  }
}

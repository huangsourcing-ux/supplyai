import { describe, expect, it, vi } from "vitest";

import {
  AmapGeocodingClient,
  AmapGeocodingFatalError,
  AmapGeocodingRowError,
  type AmapGeocodingConfig,
} from "../src/imports/amap-geocoding.client.js";

const config: AmapGeocodingConfig = {
  AMAP_WEB_SERVICE_KEY: "secret-amap-test-key",
  AMAP_GEOCODING_BASE_URL: "http://127.0.0.1:3100/v3/geocode/geo",
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function successResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: "1",
    count: "2",
    info: "OK",
    infocode: "10000",
    geocodes: [
      {
        formatted_address: "北京市朝阳区阜通东大街6号",
        level: "门牌号",
        location: "116.480881,39.989410",
      },
      {
        formatted_address: "北京市朝阳区",
        level: "区县",
        location: "116.44355,39.9219",
      },
    ],
    ...overrides,
  };
}

describe("AmapGeocodingClient", () => {
  it("encodes only the Chinese address, selects the first result, and retains candidate metadata", async () => {
    let requestedUrl = "";
    const fetchImplementation = vi.fn(async (input: URL | RequestInfo) => {
      requestedUrl = String(input);
      return jsonResponse(successResponse());
    }) as unknown as typeof fetch;
    const client = new AmapGeocodingClient(config, fetchImplementation);

    await expect(client.geocode("北京市朝阳区阜通东大街6号")).resolves.toEqual({
      candidateCount: 2,
      formattedAddress: "北京市朝阳区阜通东大街6号",
      matchLevel: "门牌号",
      locationGcj02: { lng: 116.480881, lat: 39.98941 },
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("address")).toBe("北京市朝阳区阜通东大街6号");
    expect(url.searchParams.get("key")).toBe("secret-amap-test-key");
    expect(url.searchParams.get("output")).toBe("JSON");
    expect(url.searchParams.has("city")).toBe(false);
  });

  it("turns no results and address-content errors into row failures", async () => {
    const noResults = new AmapGeocodingClient(
      config,
      vi.fn(async () =>
        jsonResponse(successResponse({ count: "0", geocodes: [] })),
      ) as unknown as typeof fetch,
    );
    await expect(noResults.geocode("无法匹配的地址")).rejects.toBeInstanceOf(
      AmapGeocodingRowError,
    );

    const invalidContent = new AmapGeocodingClient(
      config,
      vi.fn(async () =>
        jsonResponse({
          status: "0",
          count: "0",
          info: "ILLEGAL_CONTENT",
          infocode: "20012",
          geocodes: [],
        }),
      ) as unknown as typeof fetch,
    );
    await expect(invalidContent.geocode("非法内容")).rejects.toMatchObject({
      code: "20012",
    });
  });

  it("retries transient provider errors and succeeds on the third attempt", async () => {
    const responses = [
      {
        status: "0",
        count: "0",
        info: "ACCESS_TOO_FREQUENT",
        infocode: "10004",
        geocodes: [],
      },
      {
        status: "0",
        count: "0",
        info: "ENGINE_RESPONSE_DATA_ERROR",
        infocode: "30001",
        geocodes: [],
      },
      successResponse({
        count: "1",
        geocodes: [successResponse().geocodes[0]],
      }),
    ];
    const fetchImplementation = vi.fn(async () =>
      jsonResponse(responses.shift()),
    ) as unknown as typeof fetch;
    const wait = vi.fn(async () => undefined);
    const client = new AmapGeocodingClient(config, fetchImplementation, wait);

    await expect(
      client.geocode("北京市朝阳区阜通东大街6号"),
    ).resolves.toMatchObject({
      candidateCount: 1,
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenNthCalledWith(1, 250);
    expect(wait).toHaveBeenNthCalledWith(2, 500);
  });

  it("retries HTTP 429 and 5xx responses before succeeding", async () => {
    const responses = [
      new Response(null, { status: 429 }),
      new Response(null, { status: 503 }),
      jsonResponse(
        successResponse({
          count: "1",
          geocodes: [successResponse().geocodes[0]],
        }),
      ),
    ];
    const fetchImplementation = vi.fn(async () =>
      responses.shift()!,
    ) as unknown as typeof fetch;
    const wait = vi.fn(async () => undefined);
    const client = new AmapGeocodingClient(config, fetchImplementation, wait);

    await expect(client.geocode("北京市朝阳区")).resolves.toMatchObject({
      candidateCount: 1,
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it.each(["10001", "10002", "10003", "40000"])(
    "treats provider credential, permission, and quota code %s as fatal",
    async (infocode) => {
      const fetchImplementation = vi.fn(async () =>
        jsonResponse({
          status: "0",
          count: "0",
          info: "PROVIDER_FATAL",
          infocode,
          geocodes: [],
        }),
      ) as unknown as typeof fetch;
      const client = new AmapGeocodingClient(config, fetchImplementation);

      await expect(client.geocode("北京市朝阳区")).rejects.toMatchObject({
        code: infocode,
      });
      expect(fetchImplementation).toHaveBeenCalledTimes(1);
    },
  );

  it("fails safely after three network attempts without exposing the key or URL", async () => {
    const fetchImplementation = vi.fn(async () => {
      throw new Error(
        "request https://restapi.amap.com?key=secret-amap-test-key failed",
      );
    }) as unknown as typeof fetch;
    const client = new AmapGeocodingClient(
      config,
      fetchImplementation,
      async () => undefined,
    );

    await expect(client.geocode("北京市朝阳区")).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(AmapGeocodingFatalError);
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain("secret-amap-test-key");
        expect(message).not.toContain("restapi.amap.com");
        return true;
      },
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
  });

  it("aborts each stalled provider request after ten seconds", async () => {
    vi.useFakeTimers();
    try {
      const fetchImplementation = vi.fn(
        async (_input: URL | RequestInfo, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      ) as unknown as typeof fetch;
      const client = new AmapGeocodingClient(
        config,
        fetchImplementation,
        async () => undefined,
      );
      const request = client.geocode("北京市朝阳区");
      const rejection = expect(request).rejects.toMatchObject({
        code: "AMAP_NETWORK_ERROR",
      });

      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(10_000);

      await rejection;
      expect(fetchImplementation).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails immediately when the key is missing or the response is malformed", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse(successResponse()),
    ) as unknown as typeof fetch;
    const missingKey = new AmapGeocodingClient(
      { AMAP_GEOCODING_BASE_URL: config.AMAP_GEOCODING_BASE_URL },
      fetchImplementation,
    );
    await expect(missingKey.geocode("北京市")).rejects.toMatchObject({
      code: "AMAP_NOT_CONFIGURED",
    });
    expect(fetchImplementation).not.toHaveBeenCalled();

    const malformed = new AmapGeocodingClient(
      config,
      vi.fn(
        async () => new Response("{bad-json", { status: 200 }),
      ) as unknown as typeof fetch,
    );
    await expect(malformed.geocode("北京市")).rejects.toMatchObject({
      code: "AMAP_INVALID_RESPONSE",
    });
  });
});

import { createServer } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import {
  configureApiClient,
  getDeleteFavoriteUrl,
  getFactory,
  getGetFactoryUrl,
  getHealthLive,
} from "../src/index.js";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

async function listen(
  responder: Parameters<typeof createServer>[0],
): Promise<string> {
  const server = createServer(responder);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("Expected a TCP listener");
  }

  return `http://127.0.0.1:${address.port}`;
}

describe("generated fetch client", () => {
  it("encodes every path parameter as one URL segment", () => {
    expect(getGetFactoryUrl("factory/with?query#fragment%")).toBe(
      "/api/v1/factories/factory%2Fwith%3Fquery%23fragment%25",
    );
    expect(getDeleteFavoriteUrl("factory", "id/with?query#fragment%")).toBe(
      "/api/v1/favorites/factory/id%2Fwith%3Fquery%23fragment%25",
    );
  });

  it("calls the configured health URL and returns its envelope", async () => {
    let requestedUrl: string | undefined;
    const origin = await listen((request, response) => {
      requestedUrl = request.url;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          data: { status: "ok" },
          error: null,
          meta: {},
        }),
      );
    });
    configureApiClient({ baseUrl: `${origin}/api/v1` });

    await expect(getHealthLive()).resolves.toEqual({
      data: { status: "ok" },
      error: null,
      meta: {},
    });
    expect(requestedUrl).toBe("/health/live");
  });

  it("prefixes encoded generated paths with the configured deployment origin", async () => {
    let requestedUrl: string | undefined;
    const origin = await listen((request, response) => {
      requestedUrl = request.url;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ data: null, error: null, meta: {} }));
    });
    configureApiClient({ baseUrl: `${origin}/backend/api/v1` });

    await getFactory("factory/with?query#fragment%");

    expect(requestedUrl).toBe(
      "/backend/api/v1/factories/factory%2Fwith%3Fquery%23fragment%25",
    );
  });

  it("throws an error carrying status and parsed details for non-2xx", async () => {
    const origin = await listen((_request, response) => {
      response.statusCode = 503;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          data: null,
          error: {
            code: "INTERNAL",
            details: [],
            message: "Service unavailable",
          },
          meta: null,
        }),
      );
    });
    configureApiClient({ baseUrl: `${origin}/api/v1` });

    await expect(getHealthLive()).rejects.toMatchObject({
      info: {
        error: {
          code: "INTERNAL",
        },
      },
      status: 503,
    });
  });
});

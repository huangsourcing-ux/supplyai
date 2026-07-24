import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import {
  EDGE_PROXY_HEADER,
  registerEdgeProxy,
} from "../src/common/http/edge-proxy.js";

const edgeSecret = "test-edge-secret-with-at-least-32-bytes";

function createTestServer(environment: "local" | "staging") {
  const server = Fastify();
  registerEdgeProxy(server, {
    appEnvironment: environment,
    edgeProxySecret: environment === "staging" ? edgeSecret : undefined,
  });
  server.get("/api/v1/client-ip", (request) => ({
    clientIp: request.clientIp,
  }));
  server.get("/health/live", (request) => ({
    clientIp: request.clientIp,
  }));
  return server;
}

describe("Cloudflare edge proxy trust boundary", () => {
  it("uses the socket address in local development", async () => {
    const server = createTestServer("local");
    const response = await server.inject({
      method: "GET",
      remoteAddress: "198.51.100.10",
      url: "/api/v1/client-ip",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ clientIp: "198.51.100.10" });
    await server.close();
  });

  it.each(["203.0.113.44", "2001:db8::44"])(
    "accepts trusted Cloudflare metadata for %s",
    async (clientIp) => {
      const server = createTestServer("staging");
      const response = await server.inject({
        headers: {
          "cf-connecting-ip": clientIp,
          [EDGE_PROXY_HEADER]: edgeSecret,
          "x-forwarded-for": "198.51.100.200",
        },
        method: "GET",
        url: "/api/v1/client-ip",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ clientIp });
      await server.close();
    },
  );

  it("rejects a spoofed client IP without the edge secret", async () => {
    const server = createTestServer("staging");
    const response = await server.inject({
      headers: {
        "cf-connecting-ip": "203.0.113.55",
        "x-forwarded-for": "198.51.100.200",
      },
      method: "GET",
      url: "/api/v1/client-ip",
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
    await server.close();
  });

  it("rejects an incorrect edge secret", async () => {
    const server = createTestServer("staging");
    const response = await server.inject({
      headers: {
        "cf-connecting-ip": "203.0.113.55",
        [EDGE_PROXY_HEADER]: `${edgeSecret}-incorrect`,
      },
      method: "GET",
      url: "/api/v1/client-ip",
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
    await server.close();
  });

  it("rejects malformed trusted proxy metadata", async () => {
    const server = createTestServer("staging");
    const response = await server.inject({
      headers: {
        "cf-connecting-ip": "203.0.113.1, 198.51.100.1",
        [EDGE_PROXY_HEADER]: edgeSecret,
      },
      method: "GET",
      url: "/api/v1/client-ip",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      error: { code: "INTERNAL" },
    });
    await server.close();
  });

  it("keeps Railway liveness available without Cloudflare", async () => {
    const server = createTestServer("staging");
    const response = await server.inject({
      method: "GET",
      remoteAddress: "192.0.2.10",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ clientIp: "192.0.2.10" });
    await server.close();
  });
});

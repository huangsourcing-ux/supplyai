import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import type { FastifyInstance } from "fastify";

import { ApiErrorCode } from "./api-error-code.js";
import type { ApiErrorEnvelope } from "./api-envelope.js";

declare module "fastify" {
  interface FastifyRequest {
    clientIp: string;
  }
}

export const EDGE_PROXY_HEADER = "x-chinasupply-edge-token";

const directHealthPaths = new Set(["/health/live", "/health/ready"]);

export interface EdgeProxyConfig {
  appEnvironment: "local" | "production" | "staging";
  edgeProxySecret?: string;
}

export function registerEdgeProxy(
  fastify: FastifyInstance,
  config: EdgeProxyConfig,
): void {
  fastify.decorateRequest("clientIp", "");

  fastify.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?", 1)[0] ?? request.url;

    if (path === "/health/edge") {
      reply.header("Cache-Control", "no-store");
    }

    if (config.appEnvironment === "local" || directHealthPaths.has(path)) {
      request.clientIp = request.ip;
      return;
    }

    const suppliedSecret = singleHeaderValue(
      request.headers[EDGE_PROXY_HEADER],
    );

    if (
      config.edgeProxySecret === undefined ||
      suppliedSecret === undefined ||
      !secretsMatch(suppliedSecret, config.edgeProxySecret)
    ) {
      await reply
        .code(403)
        .send(
          errorEnvelope(
            ApiErrorCode.Forbidden,
            "Cloudflare edge proxy required",
          ),
        );
      return;
    }

    const connectingIp = singleHeaderValue(request.headers["cf-connecting-ip"]);

    if (connectingIp === undefined || isIP(connectingIp) === 0) {
      await reply
        .code(500)
        .send(
          errorEnvelope(ApiErrorCode.Internal, "Invalid edge proxy metadata"),
        );
      return;
    }

    request.clientIp = connectingIp;
  });
}

function singleHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string" || value.includes(",")) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function secretsMatch(supplied: string, expected: string): boolean {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);

  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

function errorEnvelope(
  code: Extract<ApiErrorCode, "FORBIDDEN" | "INTERNAL">,
  message: string,
): ApiErrorEnvelope {
  return {
    data: null,
    error: {
      code,
      details: [],
      message,
    },
    meta: null,
  };
}

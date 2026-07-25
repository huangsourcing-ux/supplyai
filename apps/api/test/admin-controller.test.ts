import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import { getRequestOrigin } from "../src/admin/admin.controller.js";

function requestWith(
  protocol: string,
  host: string | undefined,
  forwardedProtocol?: string | string[],
): FastifyRequest {
  return {
    headers: {
      host,
      "x-forwarded-proto": forwardedProtocol,
    },
    protocol,
  } as unknown as FastifyRequest;
}

describe("getRequestOrigin", () => {
  it("uses the proxy protocol for a public HTTPS request", () => {
    expect(
      getRequestOrigin(
        requestWith("http", "api-staging.chinasupply.ai", "https"),
      ),
    ).toBe("https://api-staging.chinasupply.ai");
  });

  it("uses the direct protocol when no proxy protocol is present", () => {
    expect(getRequestOrigin(requestWith("http", "localhost:3001"))).toBe(
      "http://localhost:3001",
    );
  });

  it.each([
    ["multiple proxy protocols", "api-staging.chinasupply.ai", "https,http"],
    ["an array proxy protocol", "api-staging.chinasupply.ai", ["https"]],
    ["an unsupported proxy protocol", "api-staging.chinasupply.ai", "ftp"],
    ["multiple hosts", "api-staging.chinasupply.ai,attacker.invalid", "https"],
  ])("rejects %s", (_case, host, forwardedProtocol) => {
    expect(() =>
      getRequestOrigin(requestWith("http", host, forwardedProtocol)),
    ).toThrow();
  });
});

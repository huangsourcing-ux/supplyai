import { describe, expect, it } from "vitest";

import { getCorsOptionsForRequest } from "../src/http-application.js";

const webOrigin = "https://staging.chinasupply.ai";

describe("HTTP CORS policy", () => {
  it.each(["GET", "HEAD", "OPTIONS"])(
    "allows public MAP %s responses from every origin without credentials",
    (method) => {
      expect(
        getCorsOptionsForRequest(
          {
            method,
            url: "/api/v1/map/clusters/points?category=lighting",
          },
          webOrigin,
        ),
      ).toEqual({
        credentials: false,
        origin: "*",
      });
    },
  );

  it.each([
    { method: "POST", url: "/api/v1/map/clusters/points" },
    { method: "GET", url: "/api/v1/search?q=lighting" },
    { method: "PATCH", url: "/api/v1/admin/clusters/cluster-id" },
  ])("keeps $method $url restricted to WEB_ORIGIN", (request) => {
    expect(getCorsOptionsForRequest(request, webOrigin)).toEqual({
      credentials: true,
      origin: webOrigin,
    });
  });
});

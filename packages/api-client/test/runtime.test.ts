import { describe, expect, it } from "vitest";

import { configureApiClient, getApiOrigin } from "../src/runtime.js";

describe("API client runtime", () => {
  it("derives one origin for health and /api/v1 operations", () => {
    configureApiClient({
      baseUrl: "https://api.example.com/api/v1/",
    });

    expect(getApiOrigin()).toBe("https://api.example.com");
  });

  it("preserves an optional deployment path prefix", () => {
    configureApiClient({
      baseUrl: "https://example.com/backend/api/v1",
    });

    expect(getApiOrigin()).toBe("https://example.com/backend");
  });

  it("rejects a base URL that does not follow the frozen convention", () => {
    expect(() =>
      configureApiClient({ baseUrl: "https://api.example.com/v2" }),
    ).toThrow("must end with /api/v1");
  });
});

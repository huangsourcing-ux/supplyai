import { describe, expect, it } from "vitest";

import { joinPublicMediaUrl } from "../src/media/public-media-url.service.js";

describe("public media URL", () => {
  it("joins and encodes an object key without exposing a storage origin", () => {
    expect(
      joinPublicMediaUrl(
        "https://cdn.example.com/media/",
        "staging/clusters/a cover#1.webp",
      ),
    ).toBe("https://cdn.example.com/media/staging/clusters/a%20cover%231.webp");
  });

  it("rejects unsafe object keys", () => {
    expect(() =>
      joinPublicMediaUrl("https://cdn.example.com", "../private/report.csv"),
    ).toThrow();
  });
});

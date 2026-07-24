import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n/config";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("Web internationalization contract", () => {
  it("ships English as the only V1 locale", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(SUPPORTED_LOCALES).toEqual(["en"]);
  });

  it("provides messages for every application-owned page", () => {
    const messages = JSON.parse(
      readFileSync(path.join(applicationDirectory, "messages/en.json"), "utf8"),
    );

    expect(messages.Metadata).toBeTypeOf("object");
    expect(messages.Home).toBeTypeOf("object");
    expect(messages.Map).toMatchObject({
      dataError: "Map data could not be loaded.",
      loading: "Loading industrial clusters…",
      mapError: "The map could not be loaded.",
      mapTilerLogoAlt: "MapTiler logo",
      retry: "Retry",
      truncated: "Zoom in to see all factories",
    });
    expect(messages.Operations).toBeTypeOf("object");
  });
});

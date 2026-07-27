import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    const translate = (key: string) => `translated:${namespace}.${key}`;
    translate.rich = (key: string) => `translated:${namespace}.${key}`;
    return translate;
  }),
}));

import PrivacyPage, {
  generateMetadata as generatePrivacyMetadata,
} from "../app/(frontend)/privacy/page";
import TermsPage, {
  generateMetadata as generateTermsMetadata,
} from "../app/(frontend)/terms/page";
import { config as proxyConfig } from "../proxy";
import {
  PRODUCTION_PRIVACY_URL,
  PRODUCTION_TERMS_URL,
  PUBLIC_PRIVACY_PATH,
  PUBLIC_TERMS_PATH,
  STAGING_PRIVACY_URL,
  STAGING_TERMS_URL,
} from "../legal/legal-routes";

describe("public legal pages", () => {
  it("keeps the legal route and absolute URL contract stable", () => {
    expect(PUBLIC_PRIVACY_PATH).toBe("/privacy");
    expect(PUBLIC_TERMS_PATH).toBe("/terms");
    expect(STAGING_PRIVACY_URL).toBe("https://staging.chinasupply.ai/privacy");
    expect(STAGING_TERMS_URL).toBe("https://staging.chinasupply.ai/terms");
    expect(PRODUCTION_PRIVACY_URL).toBe("https://www.chinasupply.ai/privacy");
    expect(PRODUCTION_TERMS_URL).toBe("https://www.chinasupply.ai/terms");
    expect(proxyConfig.matcher).not.toContain("/privacy/:path*");
    expect(proxyConfig.matcher).not.toContain("/terms/:path*");
  });

  it("renders the privacy policy as semantic, linked long-form content", async () => {
    const markup = renderToStaticMarkup(await PrivacyPage());

    expect(markup).toContain("<main");
    expect(markup).toContain("<article");
    expect(markup).toContain("<nav");
    expect(markup).toContain("<address>");
    expect(markup).toContain('dateTime="2026-07-26"');
    expect(markup).toContain('id="controller-and-scope"');
    expect(markup).toContain('id="your-rights-and-choices"');
    expect(markup).toContain('href="/terms"');
    expect(markup).toContain("company/17241958");
  });

  it("renders the terms with the agreed responsibility sections", async () => {
    const markup = renderToStaticMarkup(await TermsPage());

    expect(markup).toContain('id="verified-status"');
    expect(markup).toContain('id="limitation-of-liability"');
    expect(markup).toContain('id="governing-law"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/"');
  });

  it("generates route-specific translated metadata", async () => {
    await expect(generatePrivacyMetadata()).resolves.toEqual({
      description: "translated:Legal.privacy.metadata.description",
      title: "translated:Legal.privacy.metadata.title",
    });
    await expect(generateTermsMetadata()).resolves.toEqual({
      description: "translated:Legal.terms.metadata.description",
      title: "translated:Legal.terms.metadata.title",
    });
  });
});

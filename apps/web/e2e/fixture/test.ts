import type { Page } from "@playwright/test";
import playwrightMsw from "next/experimental/testmode/playwright/msw.js";

const { expect, test: base } =
  playwrightMsw as unknown as typeof import("next/experimental/testmode/playwright/msw.js");

import {
  installFixedMapResources,
  type FixedMapResources,
} from "../fixtures/map-resources";
import { createFixtureHandlers } from "../fixtures/handlers";

export interface MapFetchRecord {
  abortedAt: number | null;
  startedAt: number;
  url: string;
}

async function installMapFetchProbe(page: Page) {
  await page.addInitScript(() => {
    // PostHog intentionally drops events from automation. The fixture models a
    // real buyer browser so consent-gated requests can be asserted end to end.
    Object.defineProperty(Navigator.prototype, "webdriver", {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(Navigator.prototype, "userAgentData", {
      configurable: true,
      get: () => undefined,
    });

    const originalFetch = window.fetch.bind(window);
    window.__mapFetchRecords = [];

    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const signal =
        init?.signal ?? (input instanceof Request ? input.signal : undefined);

      if (url.includes("/api/v1/map/")) {
        const record: MapFetchRecord = {
          abortedAt: signal?.aborted === true ? performance.now() : null,
          startedAt: performance.now(),
          url,
        };
        window.__mapFetchRecords.push(record);
        signal?.addEventListener(
          "abort",
          () => {
            record.abortedAt = performance.now();
          },
          { once: true },
        );
      }

      return originalFetch(input, init);
    };
  });
}

declare global {
  interface Window {
    __mapFetchRecords: MapFetchRecord[];
  }
}

export const test = base.extend<{
  fixedMapResources: FixedMapResources;
}>({
  fixedMapResources: [
    async ({ context, msw, page }, use) => {
      msw.use(...createFixtureHandlers());
      await installMapFetchProbe(page);
      const resources = await installFixedMapResources(context);

      await use(resources);

      resources.assertNoUnexpectedExternalRequests();
    },
    { auto: true },
  ],
});

export { expect };

import { describe, expect, it, vi } from "vitest";

import { createAnalyticsClient } from "@chinasupply/analytics";

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  createAnalyticsConsentManager,
  isAnalyticsEligiblePath,
  parseStoredAnalyticsConsent,
  type AnalyticsConsentStorage,
} from "../analytics/analytics-consent";
import type { WebAnalyticsAdapter } from "../analytics/posthog-adapter";

function createStorage(
  initialValue: string | null = null,
): AnalyticsConsentStorage & { value: string | null } {
  return {
    value: initialValue,
    getItem(key) {
      expect(key).toBe(ANALYTICS_CONSENT_STORAGE_KEY);
      return this.value;
    },
    setItem(key, value) {
      expect(key).toBe(ANALYTICS_CONSENT_STORAGE_KEY);
      this.value = value;
    },
  };
}

function createAdapter(): WebAnalyticsAdapter {
  return {
    capture: vi.fn(),
    optIn: vi.fn(),
    optOut: vi.fn(),
  };
}

async function settlePromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("analytics consent persistence and routes", () => {
  it("accepts only the versioned granted and denied values", () => {
    expect(parseStoredAnalyticsConsent("granted")).toBe("granted");
    expect(parseStoredAnalyticsConsent("denied")).toBe("denied");
    expect(parseStoredAnalyticsConsent("accepted")).toBe("unknown");
    expect(parseStoredAnalyticsConsent(null)).toBe("unknown");
  });

  it("limits consent UI and first SDK load to buyer-facing routes", () => {
    expect(isAnalyticsEligiblePath("/")).toBe(true);
    expect(isAnalyticsEligiblePath("/factories/example")).toBe(true);
    expect(isAnalyticsEligiblePath("/account")).toBe(true);
    expect(isAnalyticsEligiblePath("/ops")).toBe(false);
    expect(isAnalyticsEligiblePath("/ops/factories")).toBe(false);
    expect(isAnalyticsEligiblePath("/sign-in/example")).toBe(false);
    expect(isAnalyticsEligiblePath("/admin")).toBe(false);
    expect(isAnalyticsEligiblePath(null)).toBe(false);
  });
});

describe("analytics consent manager", () => {
  it("keeps unknown and denied choices completely loader-free", () => {
    const analyticsClient = createAnalyticsClient();
    const loadAdapter = vi.fn<() => Promise<WebAnalyticsAdapter>>();
    const manager = createAnalyticsConsentManager({
      analyticsClient,
      loadAdapter,
    });
    const storage = createStorage();

    manager.setEligible(true);
    manager.initialize(storage);
    expect(manager.getSnapshot()).toMatchObject({
      choice: "unknown",
      panelOpen: true,
      ready: false,
    });
    expect(loadAdapter).not.toHaveBeenCalled();

    manager.deny();
    expect(storage.value).toBe("denied");
    expect(analyticsClient.getConsent()).toBe("denied");
    expect(loadAdapter).not.toHaveBeenCalled();
  });

  it("does not load a stored grant until a buyer route becomes eligible", async () => {
    const analyticsClient = createAnalyticsClient();
    const adapter = createAdapter();
    const loadAdapter = vi.fn(async () => adapter);
    const manager = createAnalyticsConsentManager({
      analyticsClient,
      loadAdapter,
    });

    manager.initialize(createStorage("granted"));
    expect(loadAdapter).not.toHaveBeenCalled();

    manager.setEligible(true);
    await settlePromises();

    expect(loadAdapter).toHaveBeenCalledOnce();
    expect(adapter.optIn).toHaveBeenCalledOnce();
    expect(analyticsClient.getConsent()).toBe("granted");
    expect(manager.getSnapshot().ready).toBe(true);

    manager.setEligible(false);
    expect(adapter.optOut).toHaveBeenCalledOnce();
    expect(analyticsClient.getConsent()).toBe("unknown");
    expect(manager.getSnapshot().ready).toBe(false);

    manager.setEligible(true);
    expect(loadAdapter).toHaveBeenCalledOnce();
    expect(adapter.optIn).toHaveBeenCalledTimes(2);
    expect(analyticsClient.getConsent()).toBe("granted");
  });

  it("does not activate an adapter that finishes loading on an excluded route", async () => {
    const analyticsClient = createAnalyticsClient();
    const adapter = createAdapter();
    let resolveAdapter: ((value: WebAnalyticsAdapter) => void) | undefined;
    const loadAdapter = vi.fn(
      () =>
        new Promise<WebAnalyticsAdapter>((resolve) => {
          resolveAdapter = resolve;
        }),
    );
    const manager = createAnalyticsConsentManager({
      analyticsClient,
      loadAdapter,
    });

    manager.setEligible(true);
    manager.initialize(createStorage());
    manager.allow();
    await Promise.resolve();
    manager.setEligible(false);
    resolveAdapter?.(adapter);
    await settlePromises();

    expect(adapter.optIn).not.toHaveBeenCalled();
    expect(adapter.optOut).toHaveBeenCalledOnce();
    expect(analyticsClient.getConsent()).toBe("unknown");
    expect(manager.getSnapshot().ready).toBe(false);
  });

  it("loads once after an explicit grant and disconnects on withdrawal", async () => {
    const analyticsClient = createAnalyticsClient();
    const adapter = createAdapter();
    const loadAdapter = vi.fn(async () => adapter);
    const storage = createStorage();
    const manager = createAnalyticsConsentManager({
      analyticsClient,
      loadAdapter,
    });

    manager.setEligible(true);
    manager.initialize(storage);
    manager.allow();
    await settlePromises();

    analyticsClient.trackClusterViewed({ clusterId: "cluster-1", slug: "led" });
    expect(storage.value).toBe("granted");
    expect(loadAdapter).toHaveBeenCalledOnce();
    expect(adapter.capture).toHaveBeenCalledWith("cluster_viewed", {
      clusterId: "cluster-1",
      slug: "led",
    });

    manager.openPanel();
    manager.deny();
    analyticsClient.trackClusterViewed({ clusterId: "cluster-1", slug: "led" });

    expect(adapter.optOut).toHaveBeenCalledOnce();
    expect(adapter.capture).toHaveBeenCalledOnce();
    expect(analyticsClient.getConsent()).toBe("denied");
  });

  it("applies cross-tab changes without reloading the adapter", async () => {
    const analyticsClient = createAnalyticsClient();
    const adapter = createAdapter();
    const loadAdapter = vi.fn(async () => adapter);
    const manager = createAnalyticsConsentManager({
      analyticsClient,
      loadAdapter,
    });
    manager.setEligible(true);
    manager.initialize(createStorage("granted"));
    await settlePromises();

    manager.handleStoredValue(null);
    expect(adapter.optOut).toHaveBeenCalledOnce();
    expect(analyticsClient.getConsent()).toBe("unknown");

    manager.handleStoredValue("granted");
    expect(loadAdapter).toHaveBeenCalledOnce();
    expect(adapter.optIn).toHaveBeenCalledTimes(2);
    expect(analyticsClient.getConsent()).toBe("granted");

    manager.handleStoredValue("denied");
    expect(adapter.optOut).toHaveBeenCalledTimes(2);
    expect(analyticsClient.getConsent()).toBe("denied");
  });

  it("fails closed when storage or the SDK loader is unavailable", async () => {
    const analyticsClient = createAnalyticsClient();
    const loadAdapter = vi.fn(async () => {
      throw new Error("blocked");
    });
    const manager = createAnalyticsConsentManager({
      analyticsClient,
      loadAdapter,
    });
    const blockedStorage: AnalyticsConsentStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };

    manager.setEligible(true);
    expect(() => manager.initialize(blockedStorage)).not.toThrow();
    expect(() => manager.allow()).not.toThrow();
    await settlePromises();

    expect(manager.getSnapshot()).toMatchObject({
      choice: "granted",
      panelOpen: false,
      ready: false,
    });
    expect(analyticsClient.getConsent()).toBe("unknown");
  });

  it("notifies subscribers and allows known choices to close settings", () => {
    const manager = createAnalyticsConsentManager({
      analyticsClient: createAnalyticsClient(),
      loadAdapter: vi.fn<() => Promise<WebAnalyticsAdapter>>(),
    });
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    manager.setEligible(true);
    manager.initialize(createStorage("denied"));
    manager.openPanel();
    manager.closePanel();
    unsubscribe();
    manager.openPanel();

    expect(listener).toHaveBeenCalledTimes(4);
  });
});

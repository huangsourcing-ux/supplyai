// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pickerState = vi.hoisted(() => ({
  setValue: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useField: () => ({
    setValue: pickerState.setValue,
    showError: false,
    value: "",
  }),
}));

import { ClusterCardPicker } from "../cms/components/ClusterCardPicker";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const FIRST_ID = "A12345678901234567890";
const SECOND_ID = "TjP3dEJaEU1TNHt9EBCsZ";
let container: HTMLDivElement;
let root: Root;

function feature(id: string, name: string) {
  return {
    geometry: { coordinates: [113.75, 23.02], type: "Point" },
    properties: {
      color: "#0F766E",
      factoryCount: 10,
      id,
      name_en: name,
      primaryCategoryId: "C12345678901234567890",
      slug: name.toLowerCase().replaceAll(" ", "-"),
    },
    type: "Feature",
  };
}

beforeEach(() => {
  pickerState.setValue.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        data: {
          features: [
            feature(SECOND_ID, "Zhongshan Lighting"),
            feature(FIRST_ID, "Dongguan Electronics"),
          ],
          type: "FeatureCollection",
        },
        error: null,
        meta: {},
      }),
    ),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("Cluster Card Admin picker", () => {
  it("loads only public MAP-1 options, sorts them, and saves the selected ID", async () => {
    await act(async () => {
      root.render(
        <ClusterCardPicker
          field={{ name: "clusterId", type: "text" }}
          path="body.clusterId"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const select = container.querySelector("select");
    expect(select).not.toBeNull();
    expect(select?.disabled).toBe(false);
    expect(
      [...(select?.querySelectorAll("option") ?? [])].map(
        (option) => option.textContent,
      ),
    ).toEqual([
      "Select a published cluster",
      "Dongguan Electronics",
      "Zhongshan Lighting",
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/map/clusters",
      expect.objectContaining({ credentials: "omit" }),
    );

    await act(async () => {
      if (!select) throw new Error("Expected picker select");
      select.value = SECOND_ID;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(pickerState.setValue).toHaveBeenCalledWith(SECOND_ID);
  });
});

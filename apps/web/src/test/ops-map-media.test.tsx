import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  appendFactoryImage,
  moveFactoryImage,
  removeFactoryImage,
  updateFactoryImageAlt,
  uploadAdminMediaObject,
  validateAdminMediaFile,
} from "../app/(frontend)/ops/ops-media";
import {
  OpsPointPicker,
  parseCoordinateInputs,
  roundMapCoordinates,
  type OpsPointPickerLabels,
} from "../app/(frontend)/ops/ops-point-picker";

const entityId = "fac_12345678901234567";
const mapLabels: OpsPointPickerLabels = {
  ariaLabel: "WGS-84 location picker",
  attributionLabel: "Map attribution",
  instructions: "Click the map or drag the pin.",
  latitude: "WGS-84 latitude",
  loading: "Loading location map…",
  longitude: "WGS-84 longitude",
  mapError: "Map unavailable.",
  mapTilerLogoAlt: "MapTiler",
  retry: "Retry",
};

describe("operations point picker", () => {
  it("keeps GeoJSON longitude-latitude order and rounds map values to 7 decimals", () => {
    expect(roundMapCoordinates(120.123456789, 30.987654321)).toEqual([
      120.1234568, 30.9876543,
    ]);
    expect(parseCoordinateInputs("120.5", "30.6")).toEqual([120.5, 30.6]);
    expect(parseCoordinateInputs("181", "30.6")).toBeNull();
    expect(parseCoordinateInputs("", "30.6")).toBeNull();
  });

  it("renders manual inputs, loading recovery state, and required attribution", () => {
    const markup = renderToStaticMarkup(
      <OpsPointPicker
        initialCoordinates={[120.5, 30.6]}
        labels={mapLabels}
        latitudeName="locationLat"
        longitudeName="locationLng"
      />,
    );

    expect(markup).toContain('data-coordinate-order="lng-lat"');
    expect(markup).toContain('name="locationLng"');
    expect(markup).toContain('name="locationLat"');
    expect(markup).toContain("Loading location map…");
    expect(markup).toContain("© MapTiler");
    expect(markup).toContain("© OpenStreetMap contributors");
  });
});

describe("operations media upload", () => {
  it("rejects unsupported, empty, and oversized files before presigning", () => {
    expect(() =>
      validateAdminMediaFile({ name: "bad.gif", size: 10, type: "image/gif" }),
    ).toThrow();
    expect(() =>
      validateAdminMediaFile({
        name: "empty.jpg",
        size: 0,
        type: "image/jpeg",
      }),
    ).toThrow();
    expect(() =>
      validateAdminMediaFile({
        name: "large.webp",
        size: 10 * 1024 * 1024 + 1,
        type: "image/webp",
      }),
    ).toThrow();
  });

  it("presigns with ADM-6 metadata and PUTs with no Clerk credentials", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "factory.jpg", {
      type: "image/jpeg",
    });
    const presign = vi.fn(async () => ({
      data: {
        expiresAt: "2026-07-30T12:05:00Z",
        headers: { "Content-Type": "image/jpeg" as const },
        method: "PUT" as const,
        objectKey: "staging/factories/factory.jpg",
        uploadUrl: "https://upload.example.test/signed-secret",
      },
      error: null,
      meta: {},
    }));
    const put = vi.fn(async () => new Response(null, { status: 200 }));

    await expect(
      uploadAdminMediaObject({
        entityId,
        fetchImplementation: put,
        file,
        kind: "factory-image",
        presign,
        request: { headers: { Authorization: "Bearer clerk-token" } },
      }),
    ).resolves.toBe("staging/factories/factory.jpg");

    expect(presign).toHaveBeenCalledWith(
      {
        contentLength: 3,
        contentType: "image/jpeg",
        entityId,
        fileName: "factory.jpg",
        kind: "factory-image",
      },
      { headers: { Authorization: "Bearer clerk-token" } },
    );
    expect(put).toHaveBeenCalledWith(
      "https://upload.example.test/signed-secret",
      {
        body: file,
        credentials: "omit",
        headers: { "Content-Type": "image/jpeg" },
        method: "PUT",
      },
    );
  });

  it("retries a failed reference without repeating presign or PUT", async () => {
    const file = new File([new Uint8Array([1])], "cover.webp", {
      type: "image/webp",
    });
    const presign = vi.fn(async () => ({
      data: {
        expiresAt: "2026-07-30T12:05:00Z",
        headers: { "Content-Type": "image/webp" as const },
        method: "PUT" as const,
        objectKey: "staging/clusters/cover.webp",
        uploadUrl: "https://upload.example.test/signed-secret",
      },
      error: null,
      meta: {},
    }));
    const put = vi.fn(async () => new Response(null, { status: 200 }));
    const attach = vi
      .fn<(objectKey: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("PATCH failed"))
      .mockResolvedValueOnce();

    const objectKey = await uploadAdminMediaObject({
      entityId,
      fetchImplementation: put,
      file,
      kind: "cluster-cover",
      presign,
      request: {},
    });
    await expect(attach(objectKey)).rejects.toThrow("PATCH failed");
    await expect(attach(objectKey)).resolves.toBeUndefined();

    expect(presign).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenNthCalledWith(1, objectKey);
    expect(attach).toHaveBeenNthCalledWith(2, objectKey);
  });

  it("supports append, bilingual alt updates, ordering, and detach references", () => {
    const first = {
      alt: { en: "Front", zh: "正面" },
      objectKey: "factories/front.jpg",
    };
    const second = {
      alt: { en: "Line", zh: "生产线" },
      objectKey: "factories/line.jpg",
    };
    const appended = appendFactoryImage([first], second);

    expect(appended).toEqual([first, second]);
    expect(
      updateFactoryImageAlt(appended, 0, {
        en: "Factory front",
        zh: "工厂正面",
      }),
    ).toEqual([
      {
        alt: { en: "Factory front", zh: "工厂正面" },
        objectKey: first.objectKey,
      },
      second,
    ]);
    expect(moveFactoryImage(appended, 1, -1)).toEqual([second, first]);
    expect(removeFactoryImage(appended, 0)).toEqual([second]);
  });
});

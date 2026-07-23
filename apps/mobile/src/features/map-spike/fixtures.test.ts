import {
  clusteredPoints,
  referencePoint,
  validationPolygon,
  YIWU_CENTER,
} from "./fixtures";
import { clusterLayer, unclusteredPointLayer } from "./layers";
import { reduceMapLoadState } from "./load-state";
import spikeStyle from "./spike-style.json";

describe("offline MapLibre fixtures", () => {
  it("uses WGS-84 coordinates in [lng, lat] order around Yiwu", () => {
    expect(YIWU_CENTER).toEqual([120.075, 29.306]);

    const coordinates = referencePoint.features[0]?.geometry.coordinates;
    expect(coordinates).toBeDefined();
    expect(coordinates?.[0]).toBeGreaterThan(119);
    expect(coordinates?.[0]).toBeLessThan(121);
    expect(coordinates?.[1]).toBeGreaterThan(28);
    expect(coordinates?.[1]).toBeLessThan(30);
  });

  it("keeps the polygon ring closed", () => {
    const ring = validationPolygon.features[0]?.geometry.coordinates[0];
    expect(ring).toBeDefined();
    expect(ring?.[0]).toEqual(ring?.at(-1));
  });

  it("provides cluster candidates and v11 point_count filters", () => {
    expect(clusteredPoints.features).toHaveLength(5);
    expect(clusterLayer.filter).toEqual(["has", "point_count"]);
    expect(unclusteredPointLayer.filter).toEqual(["!", ["has", "point_count"]]);
  });

  it("uses a local background-only style without remote resources", () => {
    expect(spikeStyle.sources).toEqual({});
    expect(spikeStyle.layers).toHaveLength(1);
    expect(spikeStyle.layers[0]?.type).toBe("background");
    expect(JSON.stringify(spikeStyle)).not.toMatch(/https?:\/\//);
  });

  it("models native load completion and failure explicitly", () => {
    expect(reduceMapLoadState("loading", "finished")).toBe("ready");
    expect(reduceMapLoadState("loading", "failed")).toBe("error");
    expect(reduceMapLoadState("ready", "failed")).toBe("error");
  });
});

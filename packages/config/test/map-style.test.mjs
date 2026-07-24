import assert from "node:assert/strict";
import test from "node:test";

import {
  chinaSupplyMapStyleTemplate,
  createChinaSupplyMapStyle,
  MAPTILER_KEY_TOKEN,
} from "../map/style.js";

const collectRemoteUrls = (value, urls = []) => {
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    urls.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectRemoteUrls(item, urls);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectRemoteUrls(item, urls);
  }

  return urls;
};

test("shared map style stays checked in and MapTiler-only", () => {
  assert.equal(chinaSupplyMapStyleTemplate.version, 8);
  assert.equal(
    chinaSupplyMapStyleTemplate.sources["maptiler-planet"].type,
    "vector",
  );

  const remoteUrls = collectRemoteUrls(chinaSupplyMapStyleTemplate);
  assert.ok(remoteUrls.length >= 2);
  for (const url of remoteUrls) {
    assert.equal(
      new URL(url.replace(MAPTILER_KEY_TOKEN, "test_key")).hostname,
      "api.maptiler.com",
    );
    assert.doesNotMatch(url, /\/maps\/[^/]+\/style\.json/);
  }

  assert.doesNotMatch(
    JSON.stringify(chinaSupplyMapStyleTemplate),
    /pk\.[A-Za-z0-9_-]+/,
  );
});

test("shared map style targets standard OpenMapTiles source layers", () => {
  assert.equal(
    chinaSupplyMapStyleTemplate.sources["maptiler-planet"].url,
    `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${MAPTILER_KEY_TOKEN}`,
  );
  assert.doesNotMatch(
    chinaSupplyMapStyleTemplate.sources["maptiler-planet"].url,
    /\/tiles\/v4\//,
  );

  const sourceLayers = new Set(
    chinaSupplyMapStyleTemplate.layers
      .map((layer) => layer["source-layer"])
      .filter(Boolean),
  );

  for (const sourceLayer of [
    "boundary",
    "landcover",
    "landuse",
    "place",
    "transportation",
    "water",
  ]) {
    assert.ok(
      sourceLayers.has(sourceLayer),
      `missing ${sourceLayer} source-layer`,
    );
  }
});

test("MapTiler key substitution preserves glyph tokens and isolates callers", () => {
  const firstStyle = createChinaSupplyMapStyle("public key/with symbols");
  const secondStyle = createChinaSupplyMapStyle("second_public_key");

  assert.equal(
    firstStyle.glyphs,
    "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=public%20key%2Fwith%20symbols",
  );
  assert.match(
    firstStyle.sources["maptiler-planet"].url,
    /public%20key%2Fwith%20symbols$/,
  );
  assert.match(
    secondStyle.sources["maptiler-planet"].url,
    /second_public_key$/,
  );
  assert.match(
    chinaSupplyMapStyleTemplate.sources["maptiler-planet"].url,
    new RegExp(`${MAPTILER_KEY_TOKEN}$`),
  );
});

test("MapTiler key substitution rejects missing and placeholder values", () => {
  assert.throws(() => createChinaSupplyMapStyle(""), /configured MapTiler key/);
  assert.throws(
    () => createChinaSupplyMapStyle("replace_me"),
    /configured MapTiler key/,
  );
});

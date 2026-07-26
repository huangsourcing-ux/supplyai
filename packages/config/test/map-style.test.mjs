import assert from "node:assert/strict";
import test from "node:test";

import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";

import planetV4SchemaManifest from "./fixtures/planet-v4-schema-manifest.json" with { type: "json" };
import {
  BASEMAP_LABEL_ANCHOR_LAYER_ID,
  chinaSupplyMapStyleTemplate,
  createChinaSupplyMapStyle,
  MAPTILER_KEY_TOKEN,
} from "../map/style.js";

const PLANET_V4_TILESET_URL = "https://api.maptiler.com/tiles/v4/tiles.json";

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

const collectStrings = (value, strings = []) => {
  if (typeof value === "string") {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, strings);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, strings);
  }

  return strings;
};

test("shared map style stays checked in, key-safe, MapTiler-only, and 2D", () => {
  assert.equal(chinaSupplyMapStyleTemplate.version, 8);
  assert.equal(chinaSupplyMapStyleTemplate.pitch, 0);
  assert.equal(chinaSupplyMapStyleTemplate.bearing, 0);
  assert.equal(
    chinaSupplyMapStyleTemplate.sources["maptiler-planet-v4"].type,
    "vector",
  );

  const remoteUrls = collectRemoteUrls(chinaSupplyMapStyleTemplate);
  assert.ok(remoteUrls.length >= 5);
  for (const url of remoteUrls) {
    assert.equal(
      new URL(url.replace(MAPTILER_KEY_TOKEN, "test_key")).hostname,
      "api.maptiler.com",
    );
    assert.doesNotMatch(url, /\/maps\/[^/]+\/style\.json/);
    assert.match(url, new RegExp(MAPTILER_KEY_TOKEN));
  }

  const serializedStyle = JSON.stringify(chinaSupplyMapStyleTemplate);
  assert.doesNotMatch(serializedStyle, /pk\.[A-Za-z0-9_-]+/);
  assert.doesNotMatch(serializedStyle, /fill-extrusion/);
  assert.equal(
    chinaSupplyMapStyleTemplate.layers.some(
      (layer) => layer.type === "fill-extrusion",
    ),
    false,
  );
});

test("style source layers match the committed Planet v4 schema manifest", () => {
  assert.equal(planetV4SchemaManifest.tilesetUrl, PLANET_V4_TILESET_URL);
  assert.match(planetV4SchemaManifest.retrievedAt, /^\d{4}-\d{2}-\d{2}$/);

  const tileSourceUrl =
    chinaSupplyMapStyleTemplate.sources["maptiler-planet-v4"].url;
  const parsedTileSourceUrl = new URL(
    tileSourceUrl.replace(MAPTILER_KEY_TOKEN, "test_key"),
  );
  assert.equal(
    `${parsedTileSourceUrl.origin}${parsedTileSourceUrl.pathname}`,
    PLANET_V4_TILESET_URL,
  );
  assert.equal(parsedTileSourceUrl.searchParams.get("key"), "test_key");

  const manifestLayers = new Set(
    planetV4SchemaManifest.vector_layers.map(({ id }) => id),
  );
  assert.equal(
    manifestLayers.size,
    planetV4SchemaManifest.vector_layers.length,
  );

  const sourceLayers = new Set(
    chinaSupplyMapStyleTemplate.layers
      .map((layer) => layer["source-layer"])
      .filter(Boolean),
  );

  for (const sourceLayer of sourceLayers) {
    assert.ok(
      manifestLayers.has(sourceLayer),
      `unknown Planet v4 source-layer: ${sourceLayer}`,
    );
  }

  for (const sourceLayer of [
    "road",
    "road_label",
    "country_border",
    "sub_border",
    "city_label",
    "water",
    "building",
  ]) {
    assert.ok(sourceLayers.has(sourceLayer), `missing ${sourceLayer} layer`);
  }

  assert.equal(
    ["transportation", "place", "boundary"].every((legacyLayer) =>
      sourceLayers.has(legacyLayer),
    ),
    false,
    "legacy Planet v3 transportation/place/boundary schema returned",
  );
});

test("complete Streets resources and the shared label anchor remain coherent", () => {
  const firstSymbolLayer = chinaSupplyMapStyleTemplate.layers.find(
    (layer) => layer.type === "symbol",
  );
  const anchorLayer = chinaSupplyMapStyleTemplate.layers.find(
    (layer) => layer.id === BASEMAP_LABEL_ANCHOR_LAYER_ID,
  );

  assert.equal(anchorLayer?.type, "symbol");
  assert.equal(firstSymbolLayer?.id, BASEMAP_LABEL_ANCHOR_LAYER_ID);

  const referencedStrings = collectStrings(
    chinaSupplyMapStyleTemplate.layers.map((layer) => layer.layout),
  );
  const sprites = chinaSupplyMapStyleTemplate.sprite;
  assert.ok(Array.isArray(sprites));
  for (const sprite of sprites) {
    assert.ok(
      referencedStrings.some((value) => value.includes(`${sprite.id}:`)),
      `sprite ${sprite.id} is not referenced by a style layer`,
    );
  }

  for (const sourceLayer of [
    "poi_food",
    "poi_shopping",
    "poi_tourism",
    "poi_culture",
    "poi_healthcare",
    "poi_education",
    "poi_station",
    "tree",
    "building_number",
    "traffic_control",
    "street_furniture",
    "pathway_label",
  ]) {
    assert.ok(
      chinaSupplyMapStyleTemplate.layers.some(
        (layer) => layer["source-layer"] === sourceLayer,
      ),
      `complete Streets layer ${sourceLayer} was dropped`,
    );
  }
});

test("MapLibre style validator reports zero errors", () => {
  const errors = validateStyleMin(chinaSupplyMapStyleTemplate);
  assert.deepEqual(
    errors.map((error) => error.message),
    [],
  );
});

test("MapTiler key substitution preserves resource tokens and isolates callers", () => {
  const firstStyle = createChinaSupplyMapStyle("public key/with symbols");
  const secondStyle = createChinaSupplyMapStyle("second_public_key");

  assert.equal(
    firstStyle.glyphs,
    "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=public%20key%2Fwith%20symbols",
  );
  assert.match(
    firstStyle.sources["maptiler-planet-v4"].url,
    /public%20key%2Fwith%20symbols$/,
  );
  assert.ok(
    firstStyle.sprite.every((sprite) =>
      sprite.url.endsWith("public%20key%2Fwith%20symbols"),
    ),
  );
  assert.match(
    secondStyle.sources["maptiler-planet-v4"].url,
    /second_public_key$/,
  );
  assert.match(
    chinaSupplyMapStyleTemplate.sources["maptiler-planet-v4"].url,
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

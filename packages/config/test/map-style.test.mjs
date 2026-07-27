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
const PLANET_V4_SOURCE_ID = "maptiler_planet_v4";
const ATTRIBUTION_SOURCE_ID = "maptiler_attribution";
const OFFICIAL_STREETS_V4_STYLE_URL =
  "https://api.maptiler.com/maps/streets-v4/style.json";

const collectRuntimeResourceUrls = (style) =>
  [
    style.glyphs,
    ...style.sprite.map(({ url }) => url),
    ...Object.values(style.sources).flatMap((source) => [
      source.url,
      ...(source.tiles ?? []),
    ]),
  ].filter((value) => typeof value === "string");

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

const isGetExpression = (value, field) =>
  Array.isArray(value) &&
  value.length === 2 &&
  value[0] === "get" &&
  value[1] === field;

const assertNameAccessesUseEnglishFirstFallback = (
  value,
  layerId,
  insideEnglishFirstFallback = false,
) => {
  if (value === "{name}" || value === "{name:en}") {
    assert.fail(`${layerId} retains an unnormalized name token`);
  }
  if (!Array.isArray(value)) return;

  const isEnglishFirstFallback =
    value[0] === "coalesce" &&
    isGetExpression(value[1], "name:en") &&
    isGetExpression(value[2], "name");

  if (
    (isGetExpression(value, "name") || isGetExpression(value, "name:en")) &&
    !insideEnglishFirstFallback
  ) {
    assert.fail(`${layerId} has a name access outside the English fallback`);
  }

  for (const item of value) {
    assertNameAccessesUseEnglishFirstFallback(
      item,
      layerId,
      insideEnglishFirstFallback || isEnglishFirstFallback,
    );
  }
};

test("shared map style stays checked in, key-safe, MapTiler-only, and 2D", () => {
  assert.equal(chinaSupplyMapStyleTemplate.version, 8);
  assert.equal(chinaSupplyMapStyleTemplate.pitch, 0);
  assert.equal(chinaSupplyMapStyleTemplate.bearing, 0);
  assert.equal(
    chinaSupplyMapStyleTemplate.sources[PLANET_V4_SOURCE_ID].type,
    "vector",
  );
  assert.equal(
    chinaSupplyMapStyleTemplate.metadata["chinasupply:upstream"],
    OFFICIAL_STREETS_V4_STYLE_URL,
  );
  assert.equal(
    chinaSupplyMapStyleTemplate.metadata["chinasupply:retrievedAt"],
    "2026-07-27",
  );
  assert.match(
    chinaSupplyMapStyleTemplate.metadata["chinasupply:upstreamSha256"],
    /^[a-f0-9]{64}$/,
  );
  assert.match(
    chinaSupplyMapStyleTemplate.sources[ATTRIBUTION_SOURCE_ID].attribution,
    /MapTiler.*OpenStreetMap contributors/,
  );

  const remoteUrls = collectRuntimeResourceUrls(chinaSupplyMapStyleTemplate);
  assert.equal(remoteUrls.length, 5);
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
  assert.equal(chinaSupplyMapStyleTemplate.layers.length, 158);
});

test("style source layers match the committed Planet v4 schema manifest", () => {
  assert.equal(planetV4SchemaManifest.tilesetUrl, PLANET_V4_TILESET_URL);
  assert.match(planetV4SchemaManifest.retrievedAt, /^\d{4}-\d{2}-\d{2}$/);

  const tileSourceUrl =
    chinaSupplyMapStyleTemplate.sources[PLANET_V4_SOURCE_ID].url;
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
    if (sprite.id === "default") continue;
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

  const layerIds = new Set(
    chinaSupplyMapStyleTemplate.layers.map(({ id }) => id),
  );
  for (const layerId of [
    "Highway",
    "Major road",
    "Minor road z12",
    "Road labels",
    "Traffic light",
    "Zebra crossing",
    "Railway station",
    "Bus stop",
    "Shopping",
    "Healthcare",
    "Education",
    "Food",
    "Tourism",
  ]) {
    assert.ok(
      layerIds.has(layerId),
      `official Streets layer ${layerId} missing`,
    );
  }
});

test("official Streets snapshot keeps English-first names and subdued 2D buildings", () => {
  const buildingLayers = chinaSupplyMapStyleTemplate.layers.filter(
    (layer) => layer["source-layer"] === "building",
  );
  assert.equal(buildingLayers.length, 1);
  assert.equal(buildingLayers[0].id, "Building");
  assert.equal(buildingLayers[0].type, "fill");
  assert.equal(buildingLayers[0].minzoom, 15);
  assert.equal(buildingLayers[0].maxzoom, undefined);
  assert.equal(buildingLayers[0].paint["fill-opacity"], 0.22);

  let localizedLayerCount = 0;
  for (const layer of chinaSupplyMapStyleTemplate.layers) {
    const textField = layer.layout?.["text-field"];
    if (
      textField === undefined ||
      !JSON.stringify(textField).includes("name")
    ) {
      continue;
    }
    localizedLayerCount += 1;
    assertNameAccessesUseEnglishFirstFallback(textField, layer.id);
  }
  assert.ok(localizedLayerCount >= 30);
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
    firstStyle.sources[PLANET_V4_SOURCE_ID].url,
    /public%20key%2Fwith%20symbols$/,
  );
  assert.ok(
    firstStyle.sprite.every((sprite) =>
      sprite.url.endsWith("public%20key%2Fwith%20symbols"),
    ),
  );
  assert.match(
    secondStyle.sources[PLANET_V4_SOURCE_ID].url,
    /second_public_key$/,
  );
  assert.match(
    chinaSupplyMapStyleTemplate.sources[PLANET_V4_SOURCE_ID].url,
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

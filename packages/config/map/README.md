# ChinaSupply Map Style

`chinasupply-light.json` is the checked-in, shared MapLibre style used by the Web application and reserved for the Mobile implementation. It is a sanitized snapshot of MapTiler's documented [Streets v4 Style JSON endpoint](https://api.maptiler.com/maps/streets-v4/style.json), retrieved on 2026-07-27 with the restricted staging Web key. The key was replaced before the snapshot was written to the repository.

Runtime resources are limited to `api.maptiler.com`:

- Planet v4 TileJSON: `/tiles/v4/tiles.json`
- glyphs: `/fonts/{fontstack}/{range}.pbf`
- the official Streets v4 transportation, general, and misc sprite sets

Every runtime resource URL keeps the `__MAPTILER_KEY__` token. `createChinaSupplyMapStyle` injects the platform-restricted public key without changing its public function signature. The checked-in style never requests `/maps/{id}/style.json` at runtime.

The official snapshot contains 159 layers. The checked-in derivative keeps 158: the sole `Building 3D` extrusion is removed, while the official 2D `Building` layer is unchanged from zoom 12 to 15 and continues with the same fill at zoom 15 and above. All official label expressions, colors, widths, filters, layer order, and default camera values remain unchanged. Runtime key tokens, ChinaSupply provenance metadata, and the 3D-to-2D building continuation are the only basemap differences. `BASEMAP_LABEL_ANCHOR_LAYER_ID` identifies the first official basemap symbol layer so product boundary fills can sit below labels while boundary lines, cluster points, factories, and clusters remain above labels.

The schema contract is frozen in `../test/fixtures/planet-v4-schema-manifest.json`. Snapshot provenance and the sanitized upstream SHA-256 are stored in style metadata. When MapTiler changes Streets v4 or Planet v4, download the documented endpoint with a valid restricted key, remove the key before writing, review every `source-layer` and transformation above, run the MapLibre style validator test, update fixed Playwright resources, and complete a real staging smoke before merging.

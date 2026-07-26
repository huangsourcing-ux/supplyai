# ChinaSupply Map Style

`chinasupply-light.json` is the checked-in, shared MapLibre style used by the Web application and reserved for the Mobile implementation. It is authored by ChinaSupply against the public [MapTiler Planet v4 schema](https://docs.maptiler.com/schema/planet-v4/); it is not an exported or copied MapTiler hosted style.

Runtime resources are limited to `api.maptiler.com`:

- Planet v4 TileJSON: `/tiles/v4/tiles.json`
- glyphs: `/fonts/{fontstack}/{range}.pbf`
- the transportation, general, and misc sprite sets actually referenced by style layers

Every resource URL keeps the `__MAPTILER_KEY__` token. `createChinaSupplyMapStyle` injects the platform-restricted public key without changing its public function signature. Runtime `/maps/{id}/style.json` requests are forbidden.

The V1 camera remains 2D with initial pitch `0`. Buildings are subdued 2D footprints from zoom 15; `fill-extrusion` is forbidden. `BASEMAP_LABEL_ANCHOR_LAYER_ID` identifies the first basemap symbol layer so product boundary fills can sit below labels while boundary lines, cluster points, factories, and clusters remain above labels.

The schema contract is frozen in `../test/fixtures/planet-v4-schema-manifest.json`. When MapTiler changes Planet v4, refresh that manifest deliberately, review every `source-layer`, run the MapLibre style validator test, update fixed Playwright resources, and complete real staging smoke before merging.

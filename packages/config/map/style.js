import styleTemplate from "./chinasupply-light.json" with { type: "json" };

export const MAPTILER_KEY_TOKEN = "__MAPTILER_KEY__";

/**
 * Return an isolated MapLibre style object with the public MapTiler key
 * substituted only into the checked-in MapTiler resource URLs.
 *
 * @param {string} mapTilerKey
 * @returns {Record<string, unknown>}
 */
export function createChinaSupplyMapStyle(mapTilerKey) {
  if (mapTilerKey.trim().length < 8 || /replace[_-]?me/i.test(mapTilerKey)) {
    throw new Error("A configured MapTiler key is required.");
  }

  const serializedTemplate = JSON.stringify(styleTemplate);
  if (!serializedTemplate.includes(MAPTILER_KEY_TOKEN)) {
    throw new Error(
      "The shared map style does not contain a MapTiler key token.",
    );
  }

  return JSON.parse(
    serializedTemplate.replaceAll(
      MAPTILER_KEY_TOKEN,
      encodeURIComponent(mapTilerKey),
    ),
  );
}

export { styleTemplate as chinaSupplyMapStyleTemplate };

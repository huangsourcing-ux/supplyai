type FeatureLike = {
  geometry?: {
    coordinates?: unknown;
    type?: string;
  } | null;
  properties?: Record<string, unknown> | null;
};

export type SelectedMapFeature =
  | {
      factoryCount: number;
      id: string;
      kind: "cluster";
      name: string;
      slug: string;
    }
  | {
      clusterId: string | null;
      id: string;
      kind: "factory";
      name: string;
      slug: string;
      verified: boolean;
    };

export type MapClickTarget =
  | {
      clusterId: number;
      coordinates: [number, number];
      kind: "factory-cluster";
    }
  | {
      kind: "selection";
      selection: SelectedMapFeature;
    }
  | {
      kind: "empty";
    };

export type MapClickCandidates = {
  clusterBoundary?: FeatureLike;
  clusterPoint?: FeatureLike;
  factoryCluster?: FeatureLike;
  factoryPoint?: FeatureLike;
};

const NANOID_PATTERN = /^[A-Za-z0-9_-]{21}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function readIdentity(properties: Record<string, unknown> | null | undefined) {
  if (
    properties === null ||
    properties === undefined ||
    typeof properties.id !== "string" ||
    !NANOID_PATTERN.test(properties.id) ||
    typeof properties.slug !== "string" ||
    !SLUG_PATTERN.test(properties.slug) ||
    typeof properties.name_en !== "string" ||
    properties.name_en.trim().length === 0
  ) {
    return null;
  }

  return {
    id: properties.id,
    name: properties.name_en,
    slug: properties.slug,
  };
}

export function parseClusterSelection(
  feature: FeatureLike | undefined,
): SelectedMapFeature | null {
  const identity = readIdentity(feature?.properties);
  const factoryCount = feature?.properties?.factoryCount;

  if (
    identity === null ||
    typeof factoryCount !== "number" ||
    !Number.isSafeInteger(factoryCount) ||
    factoryCount < 0
  ) {
    return null;
  }

  return {
    ...identity,
    factoryCount,
    kind: "cluster",
  };
}

export function parseFactorySelection(
  feature: FeatureLike | undefined,
): SelectedMapFeature | null {
  const identity = readIdentity(feature?.properties);
  const verified = feature?.properties?.verified;
  const clusterId = feature?.properties?.clusterId;

  if (
    identity === null ||
    typeof verified !== "boolean" ||
    (clusterId !== null &&
      (typeof clusterId !== "string" || !NANOID_PATTERN.test(clusterId)))
  ) {
    return null;
  }

  return {
    ...identity,
    clusterId,
    kind: "factory",
    verified,
  };
}

function parseFactoryCluster(
  feature: FeatureLike | undefined,
): Extract<MapClickTarget, { kind: "factory-cluster" }> | null {
  const clusterId = feature?.properties?.cluster_id;
  const coordinates =
    feature?.geometry?.type === "Point"
      ? feature.geometry.coordinates
      : undefined;

  if (
    typeof clusterId !== "number" ||
    !Number.isSafeInteger(clusterId) ||
    clusterId < 0 ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    typeof coordinates[0] !== "number" ||
    !Number.isFinite(coordinates[0]) ||
    typeof coordinates[1] !== "number" ||
    !Number.isFinite(coordinates[1])
  ) {
    return null;
  }

  return {
    clusterId,
    coordinates: [coordinates[0], coordinates[1]],
    kind: "factory-cluster",
  };
}

export function resolveMapClickTarget({
  clusterBoundary,
  clusterPoint,
  factoryCluster,
  factoryPoint,
}: MapClickCandidates): MapClickTarget {
  const parsedFactoryCluster = parseFactoryCluster(factoryCluster);
  if (parsedFactoryCluster !== null) return parsedFactoryCluster;

  const factorySelection = parseFactorySelection(factoryPoint);
  if (factorySelection !== null) {
    return {
      kind: "selection",
      selection: factorySelection,
    };
  }

  const clusterSelection =
    parseClusterSelection(clusterPoint) ??
    parseClusterSelection(clusterBoundary);
  if (clusterSelection !== null) {
    return {
      kind: "selection",
      selection: clusterSelection,
    };
  }

  return { kind: "empty" };
}

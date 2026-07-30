import {
  coreIdSchema,
  getMapClusterPointsResponseSchema,
} from "@chinasupply/schemas";

export interface PublishedCluster {
  color: string;
  factoryCount: number;
  id: string;
  name: string;
  slug: string;
}

type NextFetchInit = RequestInit & {
  next?: { revalidate: number };
};

function mapClusterUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL is required");
  return `${apiBaseUrl.replace(/\/+$/u, "")}/map/clusters/points`;
}

export async function fetchPublishedClusters(
  init: NextFetchInit = { cache: "no-store" },
): Promise<PublishedCluster[]> {
  const response = await fetch(mapClusterUrl(), init);
  if (!response.ok) {
    throw new Error(`MAP-1 returned HTTP ${response.status}`);
  }

  const envelope = getMapClusterPointsResponseSchema.parse(
    await response.json(),
  );
  return envelope.data.features.map(({ properties }) => ({
    color: properties.color,
    factoryCount: properties.factoryCount,
    id: properties.id,
    name: properties.name_en,
    slug: properties.slug,
  }));
}

export function extractClusterCardIds(body: unknown): string[] {
  const ids = new Set<string>();

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value === null || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node.type === "block") {
      const fields = node.fields;
      if (
        fields !== null &&
        typeof fields === "object" &&
        (fields as Record<string, unknown>).blockType === "clusterCard"
      ) {
        const parsed = coreIdSchema.safeParse(
          (fields as Record<string, unknown>).clusterId,
        );
        if (!parsed.success) {
          throw new Error("Cluster Card contains an invalid cluster ID");
        }
        ids.add(parsed.data);
      }
    }

    Object.values(node).forEach(visit);
  }

  visit(body);
  return [...ids];
}

export function extractLexicalPlainText(body: unknown): string {
  const parts: string[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value === null || typeof value !== "object") return;

    const node = value as Record<string, unknown>;
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
    }
    Object.values(node).forEach(visit);
  }

  visit(body);
  return parts.join(" ").replace(/\s+/gu, " ").trim();
}

export async function assertPublishedClusterCards(
  body: unknown,
): Promise<void> {
  const ids = extractClusterCardIds(body);
  if (ids.length === 0) return;

  const publishedIds = new Set(
    (await fetchPublishedClusters()).map((cluster) => cluster.id),
  );
  const unavailableIds = ids.filter((id) => !publishedIds.has(id));
  if (unavailableIds.length > 0) {
    throw new Error(
      `Cluster Card references unpublished clusters: ${unavailableIds.join(", ")}`,
    );
  }
}

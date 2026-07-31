import type { MetadataRoute } from "next";

export interface SitemapContentRecord {
  publishedAt: string;
  slug: string;
}

export interface SitemapContent {
  clusters: readonly SitemapContentRecord[];
  factories: readonly SitemapContentRecord[];
  guides: readonly SitemapContentRecord[];
}

interface CursorPage<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
  };
}

const STATIC_ROUTES = [
  { changeFrequency: "daily", path: "/", priority: 1 },
  { changeFrequency: "monthly", path: "/about", priority: 0.6 },
  { changeFrequency: "weekly", path: "/guides", priority: 0.8 },
  { changeFrequency: "yearly", path: "/privacy", priority: 0.3 },
  { changeFrequency: "yearly", path: "/terms", priority: 0.3 },
] as const;

function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}

function contentEntry(
  siteUrl: string,
  route: string,
  record: SitemapContentRecord,
  priority: number,
): MetadataRoute.Sitemap[number] {
  const url = absoluteUrl(siteUrl, `${route}/${record.slug}`);

  return {
    alternates: {
      languages: {
        en: url,
      },
    },
    changeFrequency: "weekly",
    lastModified: new Date(record.publishedAt),
    priority,
    url,
  };
}

export async function collectCursorPages<T>(
  getPage: (cursor?: string) => Promise<CursorPage<T>>,
): Promise<T[]> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await getPage(cursor);
    items.push(...page.data);

    const nextCursor = page.meta.nextCursor ?? undefined;
    if (nextCursor !== undefined) {
      if (seenCursors.has(nextCursor)) {
        throw new Error("Sitemap pagination returned a repeated cursor");
      }
      seenCursors.add(nextCursor);
    }
    cursor = nextCursor;
  } while (cursor !== undefined);

  return items;
}

export function buildSitemap(
  siteUrl: string,
  content: SitemapContent,
): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => {
    const url = absoluteUrl(siteUrl, route.path);
    return {
      alternates: {
        languages: {
          en: url,
        },
      },
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      url,
    };
  });

  return [
    ...staticEntries,
    ...content.clusters.map((record) =>
      contentEntry(siteUrl, "/clusters", record, 0.8),
    ),
    ...content.factories.map((record) =>
      contentEntry(siteUrl, "/factories", record, 0.7),
    ),
    ...content.guides.map((record) =>
      contentEntry(siteUrl, "/guides", record, 0.7),
    ),
  ];
}

export function buildRobots(
  appEnvironment: string | undefined,
  siteUrl: string,
): MetadataRoute.Robots {
  if (appEnvironment !== "production") {
    return {
      rules: {
        disallow: "/",
        userAgent: "*",
      },
    };
  }

  return {
    host: new URL(siteUrl).origin,
    rules: {
      allow: "/",
      disallow: [
        "/account",
        "/admin",
        "/api",
        "/favorites",
        "/ops",
        "/sign-in",
      ],
      userAgent: "*",
    },
    sitemap: absoluteUrl(siteUrl, "/sitemap.xml"),
  };
}

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GuideBody } from "../app/(frontend)/guides/[slug]/guide-body";
import {
  buildGuideDescription,
  buildGuideMetadata,
} from "../app/(frontend)/guides/[slug]/guide-metadata";
import type { GuideDetail } from "../app/(frontend)/guides/guide-data";
import { GuideList } from "../app/(frontend)/guides/guide-list";
import { Articles, ClusterCardBlock } from "../collections/Articles";
import { Media } from "../collections/Media";
import type { Article } from "../payload-types";
import {
  assertPublishedClusterCards,
  extractClusterCardIds,
  extractLexicalPlainText,
  type PublishedCluster,
} from "../cms/published-clusters";

const CLUSTER_ID = "TjP3dEJaEU1TNHt9EBCsZ";
const OTHER_CLUSTER_ID = "A12345678901234567890";

function bodyWithCards(...ids: string[]): Article["body"] {
  return {
    root: {
      children: [
        {
          children: [
            {
              text: "A practical guide to industrial clusters.",
              type: "text",
              version: 1,
            },
          ],
          type: "paragraph",
          version: 1,
        },
        ...ids.map((clusterId) => ({
          fields: { blockType: "clusterCard", clusterId },
          format: "",
          type: "block",
          version: 2,
        })),
      ],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  } as Article["body"];
}

const guide: GuideDetail = {
  body: bodyWithCards(CLUSTER_ID),
  cover: {
    aiGenerated: true,
    alt: "AI-generated illustration of a sourcing map",
    height: 675,
    url: "https://cdn.example.com/staging/articles/cover.webp",
    width: 1200,
  },
  id: 1,
  publishedAt: "2026-07-30T12:00:00.000Z",
  slug: "industrial-cluster-guide",
  title: "Industrial Cluster Guide",
};

afterEach(() => vi.unstubAllGlobals());

describe("Payload articles and Cluster Cards", () => {
  it("keeps CMS REST collections authenticated and cluster references as plain IDs", () => {
    expect(Articles.access?.read?.({ req: { user: null } } as never)).toBe(
      false,
    );
    expect(Articles.access?.read?.({ req: { user: { id: 1 } } } as never)).toBe(
      true,
    );
    expect(Articles.versions).toMatchObject({ drafts: true });

    const articleFields = new Map(
      Articles.fields
        .filter((field) => "name" in field)
        .map((field) => [field.name, field]),
    );
    expect(articleFields.get("locale")).toMatchObject({
      defaultValue: "en",
      required: true,
      type: "select",
    });
    expect(articleFields.get("publishedAt")).toMatchObject({
      admin: { readOnly: true },
      type: "date",
    });

    const clusterField = ClusterCardBlock.fields[0];
    expect(clusterField).toMatchObject({ name: "clusterId", type: "text" });
    expect(clusterField).not.toHaveProperty("relationTo");
    expect(ClusterCardBlock.slug).toBe("clusterCard");
  });

  it("keeps media private, typed, direct-upload-only, and uniquely keyed", () => {
    expect(Media.access?.read?.({ req: { user: null } } as never)).toBe(false);
    expect(Media.upload).toMatchObject({
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      pasteURL: false,
    });
    const objectKey = Media.fields.find(
      (field) => "name" in field && field.name === "objectKey",
    );
    const url = Media.fields.find(
      (field) => "name" in field && field.name === "url",
    );
    const thumbnailURL = Media.fields.find(
      (field) => "name" in field && field.name === "thumbnailURL",
    );
    expect(objectKey).toMatchObject({
      admin: { readOnly: true },
      required: true,
      type: "text",
      unique: true,
    });
    expect(url).toMatchObject({ type: "text", virtual: true });
    expect(thumbnailURL).toMatchObject({ type: "text", virtual: true });
  });

  it("deduplicates Cluster Card IDs and rejects malformed IDs", () => {
    expect(
      extractClusterCardIds(
        bodyWithCards(CLUSTER_ID, CLUSTER_ID, OTHER_CLUSTER_ID),
      ),
    ).toEqual([CLUSTER_ID, OTHER_CLUSTER_ID]);
    expect(() => extractClusterCardIds(bodyWithCards("draft"))).toThrow(
      /invalid cluster ID/,
    );
  });

  it("blocks publication when any Cluster Card is not in public MAP-1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          Response.json({
            data: {
              features: [
                {
                  geometry: { coordinates: [113.75, 23.02], type: "Point" },
                  properties: {
                    color: "#0F766E",
                    factoryCount: 10,
                    id: CLUSTER_ID,
                    name_en: "Dongguan Electronics Cluster",
                    primaryCategoryId: "C12345678901234567890",
                    slug: "dongguan-electronics",
                  },
                  type: "Feature",
                },
              ],
              type: "FeatureCollection",
            },
            error: null,
            meta: {},
          }),
        ),
      ),
    );

    await expect(
      assertPublishedClusterCards(bodyWithCards(CLUSTER_ID)),
    ).resolves.toBeUndefined();
    await expect(
      assertPublishedClusterCards(bodyWithCards(OTHER_CLUSTER_ID)),
    ).rejects.toThrow(OTHER_CLUSTER_ID);
  });

  it("extracts plain text and caps metadata descriptions at 155 characters", () => {
    expect(extractLexicalPlainText(guide.body)).toBe(
      "A practical guide to industrial clusters.",
    );
    expect(
      buildGuideDescription(
        bodyWithCards(),
        "Fallback should not replace body text.",
      ),
    ).toBe("A practical guide to industrial clusters.");

    const longBody = {
      root: {
        children: [{ text: "x".repeat(200), type: "text" }],
      },
    };
    expect(buildGuideDescription(longBody, "fallback")).toHaveLength(155);
  });

  it("builds canonical English article metadata with cover alt and publication time", () => {
    expect(buildGuideMetadata(guide, "fallback")).toMatchObject({
      alternates: {
        canonical: "/guides/industrial-cluster-guide",
        languages: { en: "/guides/industrial-cluster-guide" },
      },
      openGraph: {
        images: [{ alt: guide.cover.alt }],
        publishedTime: guide.publishedAt,
        type: "article",
      },
      title: "Industrial Cluster Guide | ChinaSupply.AI",
    });
  });

  it("renders guide list empty state, cover alt, and AI disclosure", () => {
    const labels = {
      aiGenerated: "AI-generated illustration",
      empty: "No guides",
      readGuide: "Read guide",
    };
    expect(
      renderToStaticMarkup(
        <GuideList articles={[]} labels={labels} locale="en" />,
      ),
    ).toContain("No guides");

    const markup = renderToStaticMarkup(
      <GuideList articles={[guide]} labels={labels} locale="en" />,
    );
    expect(markup).toContain(guide.cover.alt);
    expect(markup).toContain("AI-generated illustration");
    expect(markup).toContain("/guides/industrial-cluster-guide");
  });

  it("renders a published cluster and falls back without leaking a missing cluster", () => {
    const cluster: PublishedCluster = {
      color: "#0F766E",
      factoryCount: 12,
      id: CLUSTER_ID,
      name: "Dongguan Electronics Cluster",
      slug: "dongguan-electronics",
    };
    const labels = {
      factoryCount: (count: number) => `${count} published factories`,
      unavailable: "Cluster unavailable",
      viewCluster: "Explore cluster",
    };

    const available = renderToStaticMarkup(
      <GuideBody
        body={guide.body}
        clusters={new Map([[CLUSTER_ID, cluster]])}
        labels={labels}
      />,
    );
    expect(available).toContain("Dongguan Electronics Cluster");
    expect(available).toContain("/clusters/dongguan-electronics");

    const unavailable = renderToStaticMarkup(
      <GuideBody body={guide.body} clusters={new Map()} labels={labels} />,
    );
    expect(unavailable).toContain("Cluster unavailable");
    expect(unavailable).not.toContain("dongguan-electronics");
  });
});

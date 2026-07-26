import { decodeCursor } from "@chinasupply/schemas";
import { describe, expect, it } from "vitest";

import {
  toFavoriteItem,
  type FavoriteRow,
} from "../src/favorites/favorite.mapper.js";
import { paginateFavoriteRows } from "../src/favorites/favorites.service.js";

const ids = {
  category: "aaaaaaaaaaaaaaaaaaaaa",
  cluster: "bbbbbbbbbbbbbbbbbbbbb",
  factory: "ccccccccccccccccccccc",
  favoriteA: "ddddddddddddddddddddd",
  favoriteB: "eeeeeeeeeeeeeeeeeeeee",
  favoriteC: "fffffffffffffffffffff",
  region: "ggggggggggggggggggggg",
};
const createdAt = new Date("2026-07-26T12:00:00.000Z");

function row(
  id: string,
  targetType: "cluster" | "factory" = "cluster",
): FavoriteRow {
  return {
    createdAt,
    id,
    targetId: targetType === "cluster" ? ids.cluster : ids.factory,
    targetType,
  };
}

const region = {
  id: ids.region,
  level: "city" as const,
  name: "Dongguan",
};
const cluster = {
  centroid: {
    coordinates: [113.75, 23.04] as [number, number],
    type: "Point" as const,
  },
  coverImageUrl: null,
  factoryCount: 3,
  id: ids.cluster,
  mainProducts: ["Electronics"],
  name: "Dongguan Electronics",
  primaryCategory: {
    color: "#112233",
    icon: null,
    id: ids.category,
    name: "Electronics",
    parentId: null,
    slug: "electronics",
    sortOrder: 1,
  },
  publishedAt: "2026-07-25T12:00:00.000Z",
  region,
  slug: "dongguan-electronics",
  summary: "Electronics manufacturing cluster",
};
const factory = {
  cluster: null,
  id: ids.factory,
  imageUrl: null,
  location: {
    coordinates: [113.76, 23.05] as [number, number],
    type: "Point" as const,
  },
  mainProducts: ["Circuit boards"],
  name: "Dongguan Circuit Factory",
  publishedAt: "2026-07-25T13:00:00.000Z",
  region,
  slug: "dongguan-circuit-factory",
  verified: true,
};

describe("favorite pagination", () => {
  it("uses createdAt and id for a stable descending cursor", () => {
    const result = paginateFavoriteRows(
      [row(ids.favoriteC), row(ids.favoriteB), row(ids.favoriteA)],
      2,
    );

    expect(result.pageRows.map((item) => item.id)).toEqual([
      ids.favoriteC,
      ids.favoriteB,
    ]);
    expect(result.nextCursor).not.toBeNull();
    expect(decodeCursor(result.nextCursor as string)).toEqual({
      sort: [createdAt.toISOString(), ids.favoriteB],
      v: 1,
    });
  });

  it("does not emit a cursor without a proving extra row", () => {
    expect(paginateFavoriteRows([row(ids.favoriteA)], 1).nextCursor).toBeNull();
  });
});

describe("favorite target mapping", () => {
  it("preserves the target discriminant and published summary", () => {
    expect(
      toFavoriteItem(row(ids.favoriteA), {
        clusters: new Map([[ids.cluster, cluster]]),
        factories: new Map(),
      }),
    ).toMatchObject({
      id: ids.favoriteA,
      target: { id: ids.cluster, name: "Dongguan Electronics" },
      targetType: "cluster",
    });

    expect(
      toFavoriteItem(row(ids.favoriteB, "factory"), {
        clusters: new Map(),
        factories: new Map([[ids.factory, factory]]),
      }),
    ).toMatchObject({
      id: ids.favoriteB,
      target: { id: ids.factory, verified: true },
      targetType: "factory",
    });
  });

  it("returns null for an unpublished, removed, or dangling target", () => {
    expect(
      toFavoriteItem(row(ids.favoriteA), {
        clusters: new Map(),
        factories: new Map(),
      }),
    ).toMatchObject({ target: null, targetId: ids.cluster });
  });
});

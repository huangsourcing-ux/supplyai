import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CORE_TABLE_NAMES, createCoreId } from "../src/database/schema.js";

const apiDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const migrationSource = readFileSync(
  path.join(apiDirectory, "drizzle/0000_initial_core.sql"),
  "utf8",
).toLowerCase();

const payloadOwnedTables = [
  "articles",
  "media",
  "cms_users",
  "payload_kv",
  "payload_locked_documents",
  "payload_preferences",
  "payload_migrations",
];

describe("core Drizzle schema", () => {
  it("owns exactly the frozen core business tables", () => {
    expect([...CORE_TABLE_NAMES].sort()).toEqual(
      [
        "regions",
        "categories",
        "clusters",
        "cluster_categories",
        "factories",
        "factory_categories",
        "users",
        "favorites",
        "webhook_events",
      ].sort(),
    );

    const migratedTables = [
      ...migrationSource.matchAll(/create table "([^"]+)"/g),
    ].map((match) => match[1]);
    expect(migratedTables.sort()).toEqual([...CORE_TABLE_NAMES].sort());
  });

  it("generates 21-character internal IDs", () => {
    expect(createCoreId()).toHaveLength(21);
    expect(createCoreId()).not.toBe(createCoreId());
  });

  it("creates required extensions, geometries, indexes, and constraints", () => {
    expect(
      migrationSource.indexOf("create extension if not exists postgis"),
    ).toBeLessThan(migrationSource.indexOf('create table "regions"'));
    expect(
      migrationSource.indexOf("create extension if not exists pg_trgm"),
    ).toBeLessThan(migrationSource.indexOf('create table "categories"'));

    expect(migrationSource).toContain("geometry(point,4326)");
    expect(migrationSource).toContain("geometry(multipolygon,4326)");
    expect(migrationSource.match(/using gist/g)).toHaveLength(3);
    expect(migrationSource.match(/to_tsvector\('english'/g)).toHaveLength(3);
    expect(migrationSource.match(/gin_trgm_ops/g)).toHaveLength(6);
    expect(migrationSource).toContain('"clusters_status_published_at_id_idx"');
    expect(migrationSource).toContain('"factories_status_published_at_id_idx"');
    expect(migrationSource).toContain('"factories_status_cluster_id_idx"');
    expect(migrationSource).toContain(
      "create constraint trigger clusters_primary_category_constraint",
    );
    expect(migrationSource).toContain(
      "create constraint trigger categories_two_levels_constraint",
    );
  });

  it("never mutates Payload-owned tables", () => {
    for (const table of payloadOwnedTables) {
      expect(migrationSource).not.toMatch(
        new RegExp(
          `(?:create|alter|drop)\\s+table(?:\\s+if\\s+(?:not\\s+)?exists)?\\s+["']?${table}["']?(?:\\s|\\()`,
          "i",
        ),
      );
    }
  });
});

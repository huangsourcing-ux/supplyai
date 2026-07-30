import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cmsCollections } from "../collections/index";

const sourceDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const migrationDirectory = path.join(sourceDirectory, "migrations");
const forbiddenCoreTables = [
  "regions",
  "categories",
  "clusters",
  "cluster_categories",
  "factories",
  "factory_categories",
  "users",
  "favorites",
  "webhook_events",
];

describe("Payload schema ownership", () => {
  it("registers only Payload-owned collections", () => {
    expect(cmsCollections.map((collection) => collection.slug)).toEqual([
      "cms-users",
      "media",
      "articles",
    ]);
  });

  it("keeps the baseline migration inside the CMS boundary", () => {
    expect(existsSync(migrationDirectory)).toBe(true);

    const migrationSource = readdirSync(migrationDirectory)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => readFileSync(path.join(migrationDirectory, file), "utf8"))
      .join("\n")
      .toLowerCase();

    expect(migrationSource).toContain("cms_users");
    expect(migrationSource).toContain('create table "media"');
    expect(migrationSource).toContain('create table "articles"');
    expect(migrationSource).toContain('create table "_articles_v"');
    expect(migrationSource).toContain("\"prefix\" varchar default 'articles'");
    expect(migrationSource).not.toContain('"url" varchar');
    expect(migrationSource).not.toContain('"thumbnail_u_r_l" varchar');
    expect(
      migrationSource.indexOf(
        'drop constraint "payload_locked_documents_rels_media_fk"',
      ),
    ).toBeLessThan(migrationSource.indexOf('drop table "media" cascade'));

    for (const table of forbiddenCoreTables) {
      expect(migrationSource).not.toMatch(
        new RegExp(
          `(?:create|alter|drop)\\s+table(?:\\s+if\\s+(?:not\\s+)?exists)?\\s+[\"']?${table}[\"']?(?:\\s|\\()`,
          "i",
        ),
      );
    }
  });

  it("keeps migrations explicit and disables Payload schema push", () => {
    const payloadConfig = readFileSync(
      path.join(sourceDirectory, "payload.config.ts"),
      "utf8",
    );
    const packageConfig = JSON.parse(
      readFileSync(path.join(sourceDirectory, "../package.json"), "utf8"),
    );
    const payloadCli = readFileSync(
      path.join(sourceDirectory, "../scripts/payload-cli.mjs"),
      "utf8",
    );

    expect(payloadConfig).toMatch(/push:\s*false/);
    expect(payloadConfig).toMatch(/alwaysInsertFields:\s*true/);
    expect(payloadCli).toContain('"@chinasupply/schemas", "build"');
    expect(packageConfig.scripts.build).toBe("next build");
    expect(packageConfig.scripts.start).toBe("next start");
    expect(packageConfig.scripts.build).not.toMatch(/migrat/i);
    expect(packageConfig.scripts.start).not.toMatch(/migrat/i);
  });
});

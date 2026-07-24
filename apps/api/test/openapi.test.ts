import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { openApiDocument } from "../src/openapi/openapi-document.js";
import { apiRouteContracts } from "../src/openapi/route-contracts.js";

const trackedDocumentPath = fileURLToPath(
  new URL("../openapi.json", import.meta.url),
);

function getOperations() {
  return Object.entries(openApiDocument.paths ?? {}).flatMap(
    ([path, pathItem]) =>
      Object.entries(pathItem ?? {})
        .filter(([, operation]) => typeof operation === "object")
        .map(([method, operation]) => ({ method, operation, path })),
  );
}

describe("OpenAPI contract", () => {
  it("contains 30 business operations plus health with unique operation IDs", () => {
    const operations = getOperations();
    const operationIds = operations.map(
      ({ operation }) => (operation as { operationId?: string }).operationId,
    );

    expect(apiRouteContracts).toHaveLength(31);
    expect(operations).toHaveLength(31);
    expect(new Set(operationIds)).toHaveLength(31);
    expect(operationIds).toContain("getHealthLive");
    expect(
      operations.filter(({ path }) => path.startsWith("/api/v1/")),
    ).toHaveLength(30);
  });

  it("describes public, user, admin, path parameter, and raw health behavior", () => {
    const paths = openApiDocument.paths as Record<
      string,
      Record<string, Record<string, unknown>>
    >;

    expect(paths["/health/live"]?.get?.security).toBeUndefined();
    expect(paths["/api/v1/clusters"]?.get?.security).toBeUndefined();
    expect(paths["/api/v1/favorites"]?.get?.security).toEqual([
      { clerkBearer: [] },
    ]);
    expect(paths["/api/v1/admin/factories/{id}"]?.patch?.security).toEqual([
      { clerkBearer: [] },
    ]);
    expect(paths["/api/v1/clusters/{slug}"]?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: "path", name: "slug", required: true }),
      ]),
    );
  });

  it("keeps the tracked document semantically identical to runtime", async () => {
    const trackedDocument = await readFile(trackedDocumentPath, "utf8");

    expect(JSON.parse(trackedDocument)).toEqual(openApiDocument);
  });
});

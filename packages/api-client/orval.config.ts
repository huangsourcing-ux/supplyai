import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../../apps/api/openapi.json",
    },
    output: {
      baseUrl: {
        imports: [
          {
            importPath: "../../runtime",
            name: "getApiOrigin",
          },
        ],
        runtime: "getApiOrigin()",
      },
      clean: true,
      client: "react-query",
      formatter: "prettier",
      httpClient: "fetch",
      indexFiles: true,
      mode: "tags-split",
      mock: {
        generators: [
          {
            delay: false,
            preferredContentType: "application/json",
            type: "msw",
          },
        ],
        indexMockFiles: true,
      },
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          name: "apiFetch",
          path: "./src/fetcher.ts",
        },
        query: {
          signal: true,
        },
      },
      schemas: "./src/generated/models",
      target: "./src/generated/client",
      tagsSplitDeduplication: true,
    },
  },
});

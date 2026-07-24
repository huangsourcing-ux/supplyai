import { createDocument } from "zod-openapi";

import {
  apiErrorEnvelopeSchema,
  apiRouteContracts,
  type ApiRouteContract,
} from "./route-contracts.js";

type DocumentInput = Parameters<typeof createDocument>[0];
type DocumentPaths = NonNullable<DocumentInput["paths"]>;

const jsonContent = (schema: ApiRouteContract["response"]) => ({
  "application/json": { schema },
});

function createOperation(contract: ApiRouteContract) {
  const requestParams = {
    ...(contract.request?.headers === undefined
      ? {}
      : { header: contract.request.headers }),
    ...(contract.request?.params === undefined
      ? {}
      : { path: contract.request.params }),
    ...(contract.request?.query === undefined
      ? {}
      : { query: contract.request.query }),
  };
  const hasRequestParams = Object.keys(requestParams).length > 0;

  return {
    operationId: contract.operationId,
    summary: contract.summary,
    tags: [contract.tag],
    ...(contract.access === "admin" || contract.access === "user"
      ? { security: [{ clerkBearer: [] }] }
      : {}),
    ...(hasRequestParams ? { requestParams } : {}),
    ...(contract.request?.body === undefined
      ? {}
      : {
          requestBody: {
            required: true,
            content: jsonContent(contract.request.body),
          },
        }),
    responses: {
      [String(contract.successStatus ?? 200)]: {
        description: "Successful response",
        content: jsonContent(contract.response),
      },
      default: {
        description: "Error response",
        content: jsonContent(apiErrorEnvelopeSchema),
      },
    },
  };
}

function createPaths(): DocumentPaths {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const contract of apiRouteContracts) {
    const path = (paths[contract.path] ??= {});
    path[contract.method] = createOperation(contract);
  }

  return paths as DocumentPaths;
}

export type ChinaSupplyOpenApiDocument = ReturnType<typeof createDocument>;

export const openApiDocument: ChinaSupplyOpenApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    description:
      "Contract-first API for ChinaSupply.AI Web and mobile clients.",
    title: "ChinaSupply.AI API",
    version: "1.0.0",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      clerkBearer: {
        bearerFormat: "JWT",
        scheme: "bearer",
        type: "http",
      },
    },
  },
  paths: createPaths(),
});

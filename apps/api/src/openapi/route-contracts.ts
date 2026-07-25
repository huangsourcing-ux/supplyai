import {
  apiErrorEnvelopeSchema,
  clerkWebhookBodySchema,
  clerkWebhookHeadersSchema,
  clerkWebhookResponseSchema,
  createAdminClusterBodySchema,
  createAdminClusterResponseSchema,
  createAdminFactoryBodySchema,
  createAdminFactoryResponseSchema,
  createFavoriteBodySchema,
  createFavoriteResponseSchema,
  createUploadPresignBodySchema,
  createUploadPresignResponseSchema,
  deleteFavoriteParamsSchema,
  deleteFavoriteResponseSchema,
  deleteMeResponseSchema,
  getAdminClusterParamsSchema,
  getAdminClusterResponseSchema,
  getAdminClustersQuerySchema,
  getAdminClustersResponseSchema,
  getAdminFactoriesQuerySchema,
  getAdminFactoriesResponseSchema,
  getAdminFactoryParamsSchema,
  getAdminFactoryResponseSchema,
  getCategoriesQuerySchema,
  getCategoriesResponseSchema,
  getClusterFactoriesParamsSchema,
  getClusterFactoriesQuerySchema,
  getClusterFactoriesResponseSchema,
  getClusterParamsSchema,
  getClusterResponseSchema,
  getClustersQuerySchema,
  getClustersResponseSchema,
  getFactoriesQuerySchema,
  getFactoriesResponseSchema,
  getFactoryParamsSchema,
  getFactoryResponseSchema,
  getFavoritesQuerySchema,
  getFavoritesResponseSchema,
  getMapClusterBoundariesQuerySchema,
  getMapClusterBoundariesResponseSchema,
  getMapClusterPointsQuerySchema,
  getMapClusterPointsResponseSchema,
  getMapFactoriesQuerySchema,
  getMapFactoriesResponseSchema,
  healthLiveResponseSchema,
  publishAdminClusterParamsSchema,
  publishAdminClusterResponseSchema,
  publishAdminFactoryParamsSchema,
  publishAdminFactoryResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  unpublishAdminClusterParamsSchema,
  unpublishAdminClusterResponseSchema,
  unpublishAdminFactoryParamsSchema,
  unpublishAdminFactoryResponseSchema,
  updateAdminClusterBodySchema,
  updateAdminClusterParamsSchema,
  updateAdminClusterResponseSchema,
  updateAdminFactoryBodySchema,
  updateAdminFactoryParamsSchema,
  updateAdminFactoryResponseSchema,
  updateMeBodySchema,
  updateMeResponseSchema,
  verifyAdminFactoryParamsSchema,
  verifyAdminFactoryResponseSchema,
} from "@chinasupply/schemas";
import { createZodDto } from "nestjs-zod";
import type { z } from "zod";

export type ApiAccess = "admin" | "health" | "public" | "user" | "webhook";
export type ApiHttpMethod = "delete" | "get" | "patch" | "post";

export interface ApiRequestSchemas {
  body?: z.ZodType;
  headers?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

interface RouteContractDefinition {
  access: ApiAccess;
  method: ApiHttpMethod;
  operationId: string;
  path: string;
  request?: ApiRequestSchemas;
  response: z.ZodType;
  successStatus?: number;
  summary: string;
  tag: string;
}

export interface ApiRouteContract extends RouteContractDefinition {
  nestDtos: {
    body?: ReturnType<typeof createZodDto>;
    headers?: ReturnType<typeof createZodDto>;
    params?: ReturnType<typeof createZodDto>;
    query?: ReturnType<typeof createZodDto>;
  };
}

function createDto(schema: z.ZodType | undefined) {
  return schema === undefined ? undefined : createZodDto(schema);
}

function defineRouteContract(
  definition: RouteContractDefinition,
): ApiRouteContract {
  return {
    ...definition,
    nestDtos: {
      body: createDto(definition.request?.body),
      headers: createDto(definition.request?.headers),
      params: createDto(definition.request?.params),
      query: createDto(definition.request?.query),
    },
  };
}

export const getClustersRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getClusters",
  path: "/api/v1/clusters",
  request: { query: getClustersQuerySchema },
  response: getClustersResponseSchema,
  summary: "List published industrial clusters",
  tag: "clusters",
});

export const getClusterRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getCluster",
  path: "/api/v1/clusters/{slug}",
  request: { params: getClusterParamsSchema },
  response: getClusterResponseSchema,
  summary: "Get a published industrial cluster",
  tag: "clusters",
});

export const getCategoriesRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getCategories",
  path: "/api/v1/categories",
  request: { query: getCategoriesQuerySchema },
  response: getCategoriesResponseSchema,
  summary: "Get the public category tree",
  tag: "categories",
});

export const getClusterFactoriesRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getClusterFactories",
  path: "/api/v1/clusters/{slug}/factories",
  request: {
    params: getClusterFactoriesParamsSchema,
    query: getClusterFactoriesQuerySchema,
  },
  response: getClusterFactoriesResponseSchema,
  summary: "List published factories in a cluster",
  tag: "clusters",
});

export const getFactoriesRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getFactories",
  path: "/api/v1/factories",
  request: { query: getFactoriesQuerySchema },
  response: getFactoriesResponseSchema,
  summary: "List published factories",
  tag: "factories",
});

export const getFactoryRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getFactory",
  path: "/api/v1/factories/{slug}",
  request: { params: getFactoryParamsSchema },
  response: getFactoryResponseSchema,
  summary: "Get a published factory",
  tag: "factories",
});

export const searchRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "search",
  path: "/api/v1/search",
  request: { query: searchQuerySchema },
  response: searchResponseSchema,
  summary: "Search categories, clusters, and factories",
  tag: "search",
});

export const getMapClusterPointsRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getMapClusterPoints",
  path: "/api/v1/map/clusters/points",
  request: { query: getMapClusterPointsQuerySchema },
  response: getMapClusterPointsResponseSchema,
  summary: "Get published cluster points",
  tag: "map",
});

export const getMapClusterBoundariesRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getMapClusterBoundaries",
  path: "/api/v1/map/clusters/boundaries",
  request: { query: getMapClusterBoundariesQuerySchema },
  response: getMapClusterBoundariesResponseSchema,
  summary: "Get published cluster boundaries in a viewport",
  tag: "map",
});

export const getMapFactoriesRouteContract = defineRouteContract({
  access: "public",
  method: "get",
  operationId: "getMapFactories",
  path: "/api/v1/map/factories",
  request: { query: getMapFactoriesQuerySchema },
  response: getMapFactoriesResponseSchema,
  summary: "Get published factory points in a viewport",
  tag: "map",
});

export const apiRouteContracts = [
  defineRouteContract({
    access: "health",
    method: "get",
    operationId: "getHealthLive",
    path: "/health/live",
    response: healthLiveResponseSchema,
    summary: "Liveness probe",
    tag: "health",
  }),
  getClustersRouteContract,
  getClusterRouteContract,
  getClusterFactoriesRouteContract,
  getFactoriesRouteContract,
  getFactoryRouteContract,
  searchRouteContract,
  getCategoriesRouteContract,
  defineRouteContract({
    access: "user",
    method: "get",
    operationId: "getFavorites",
    path: "/api/v1/favorites",
    request: { query: getFavoritesQuerySchema },
    response: getFavoritesResponseSchema,
    summary: "List the current user's favorites",
    tag: "favorites",
  }),
  defineRouteContract({
    access: "user",
    method: "post",
    operationId: "createFavorite",
    path: "/api/v1/favorites",
    request: { body: createFavoriteBodySchema },
    response: createFavoriteResponseSchema,
    summary: "Create or return an existing favorite",
    tag: "favorites",
  }),
  defineRouteContract({
    access: "user",
    method: "delete",
    operationId: "deleteFavorite",
    path: "/api/v1/favorites/{targetType}/{targetId}",
    request: { params: deleteFavoriteParamsSchema },
    response: deleteFavoriteResponseSchema,
    summary: "Ensure a favorite is absent",
    tag: "favorites",
  }),
  defineRouteContract({
    access: "user",
    method: "patch",
    operationId: "updateMe",
    path: "/api/v1/me",
    request: { body: updateMeBodySchema },
    response: updateMeResponseSchema,
    summary: "Update the current user's profile",
    tag: "account",
  }),
  defineRouteContract({
    access: "user",
    method: "delete",
    operationId: "deleteMe",
    path: "/api/v1/me",
    response: deleteMeResponseSchema,
    summary: "Request deletion of the current account",
    tag: "account",
  }),
  defineRouteContract({
    access: "webhook",
    method: "post",
    operationId: "handleClerkWebhook",
    path: "/api/v1/webhooks/clerk",
    request: {
      body: clerkWebhookBodySchema,
      headers: clerkWebhookHeadersSchema,
    },
    response: clerkWebhookResponseSchema,
    summary: "Process a signed Clerk user webhook",
    tag: "webhooks",
  }),
  getMapClusterPointsRouteContract,
  getMapClusterBoundariesRouteContract,
  getMapFactoriesRouteContract,
  defineRouteContract({
    access: "admin",
    method: "get",
    operationId: "getAdminClusters",
    path: "/api/v1/admin/clusters",
    request: { query: getAdminClustersQuerySchema },
    response: getAdminClustersResponseSchema,
    summary: "List clusters for administration",
    tag: "admin-clusters",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "createAdminCluster",
    path: "/api/v1/admin/clusters",
    request: { body: createAdminClusterBodySchema },
    response: createAdminClusterResponseSchema,
    summary: "Create a draft cluster",
    tag: "admin-clusters",
  }),
  defineRouteContract({
    access: "admin",
    method: "get",
    operationId: "getAdminCluster",
    path: "/api/v1/admin/clusters/{id}",
    request: { params: getAdminClusterParamsSchema },
    response: getAdminClusterResponseSchema,
    summary: "Get a cluster for administration",
    tag: "admin-clusters",
  }),
  defineRouteContract({
    access: "admin",
    method: "patch",
    operationId: "updateAdminCluster",
    path: "/api/v1/admin/clusters/{id}",
    request: {
      body: updateAdminClusterBodySchema,
      params: updateAdminClusterParamsSchema,
    },
    response: updateAdminClusterResponseSchema,
    summary: "Update a cluster",
    tag: "admin-clusters",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "publishAdminCluster",
    path: "/api/v1/admin/clusters/{id}/publish",
    request: { params: publishAdminClusterParamsSchema },
    response: publishAdminClusterResponseSchema,
    summary: "Publish a cluster",
    tag: "admin-clusters",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "unpublishAdminCluster",
    path: "/api/v1/admin/clusters/{id}/unpublish",
    request: { params: unpublishAdminClusterParamsSchema },
    response: unpublishAdminClusterResponseSchema,
    summary: "Unpublish a cluster",
    tag: "admin-clusters",
  }),
  defineRouteContract({
    access: "admin",
    method: "get",
    operationId: "getAdminFactories",
    path: "/api/v1/admin/factories",
    request: { query: getAdminFactoriesQuerySchema },
    response: getAdminFactoriesResponseSchema,
    summary: "List factories for administration",
    tag: "admin-factories",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "createAdminFactory",
    path: "/api/v1/admin/factories",
    request: { body: createAdminFactoryBodySchema },
    response: createAdminFactoryResponseSchema,
    summary: "Create a draft factory",
    tag: "admin-factories",
  }),
  defineRouteContract({
    access: "admin",
    method: "get",
    operationId: "getAdminFactory",
    path: "/api/v1/admin/factories/{id}",
    request: { params: getAdminFactoryParamsSchema },
    response: getAdminFactoryResponseSchema,
    summary: "Get a factory for administration",
    tag: "admin-factories",
  }),
  defineRouteContract({
    access: "admin",
    method: "patch",
    operationId: "updateAdminFactory",
    path: "/api/v1/admin/factories/{id}",
    request: {
      body: updateAdminFactoryBodySchema,
      params: updateAdminFactoryParamsSchema,
    },
    response: updateAdminFactoryResponseSchema,
    summary: "Update a factory",
    tag: "admin-factories",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "publishAdminFactory",
    path: "/api/v1/admin/factories/{id}/publish",
    request: { params: publishAdminFactoryParamsSchema },
    response: publishAdminFactoryResponseSchema,
    summary: "Publish a factory",
    tag: "admin-factories",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "unpublishAdminFactory",
    path: "/api/v1/admin/factories/{id}/unpublish",
    request: { params: unpublishAdminFactoryParamsSchema },
    response: unpublishAdminFactoryResponseSchema,
    summary: "Unpublish a factory",
    tag: "admin-factories",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "verifyAdminFactory",
    path: "/api/v1/admin/factories/{id}/verify",
    request: { params: verifyAdminFactoryParamsSchema },
    response: verifyAdminFactoryResponseSchema,
    summary: "Verify a factory",
    tag: "admin-factories",
  }),
  defineRouteContract({
    access: "admin",
    method: "post",
    operationId: "createUploadPresign",
    path: "/api/v1/admin/uploads/presign",
    request: { body: createUploadPresignBodySchema },
    response: createUploadPresignResponseSchema,
    summary: "Create a presigned media upload",
    tag: "admin-uploads",
  }),
] as const satisfies readonly ApiRouteContract[];

export function getRouteContract(operationId: string): ApiRouteContract {
  const contract = apiRouteContracts.find(
    (candidate) => candidate.operationId === operationId,
  );
  if (contract === undefined) {
    throw new Error(`Unknown API operation: ${operationId}`);
  }
  return contract;
}

export { apiErrorEnvelopeSchema };

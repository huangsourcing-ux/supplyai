import type { RequestHandler } from "next/experimental/testmode/playwright/msw.js";

import {
  getGetCategoriesMockHandler,
  getGetClusterFactoriesMockHandler,
  getGetClusterMockHandler,
  getGetFactoryMockHandler,
  getGetMapClusterBoundariesMockHandler,
  getGetMapClusterPointsMockHandler,
  getGetMapFactoriesMockHandler,
  getSearchMockHandler,
} from "@chinasupply/api-client/mocks";

import {
  categoriesResponse,
  clusterBoundariesResponse,
  clusterFactoriesResponse,
  clusterPointsResponse,
  clusterResponse,
  factoryPointsResponse,
  factoryResponse,
  searchResponse,
} from "./data";

export function createFixtureHandlers(): RequestHandler[] {
  return [
    getGetCategoriesMockHandler(categoriesResponse),
    getGetMapClusterPointsMockHandler(clusterPointsResponse),
    getGetMapClusterBoundariesMockHandler(clusterBoundariesResponse),
    getGetMapFactoriesMockHandler(factoryPointsResponse),
    getSearchMockHandler(searchResponse),
    getGetClusterFactoriesMockHandler(clusterFactoriesResponse),
    getGetClusterMockHandler(clusterResponse),
    getGetFactoryMockHandler(factoryResponse),
  ];
}

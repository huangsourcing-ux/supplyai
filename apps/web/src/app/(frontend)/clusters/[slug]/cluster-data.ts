import { cache } from "react";

import {
  configureApiClient,
  getCluster,
  getClusterFactories,
  type GetCluster200,
  type GetClusterFactories200,
} from "@chinasupply/api-client";

import {
  CLUSTER_DETAIL_REVALIDATE_SECONDS,
  CLUSTER_FACTORY_PAGE_SIZE,
} from "./cluster-constants";
import { isMissingClusterResponse } from "./cluster-errors";

type RevalidatedRequestInit = RequestInit & {
  next: {
    revalidate: number;
  };
};

const revalidatedRequest: RevalidatedRequestInit = {
  cache: "force-cache",
  next: {
    revalidate: CLUSTER_DETAIL_REVALIDATE_SECONDS,
  },
};

configureApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
});

export const getClusterPageData = cache(
  async (slug: string): Promise<GetCluster200 | null> => {
    try {
      return await getCluster(encodeURIComponent(slug), revalidatedRequest);
    } catch (error) {
      if (isMissingClusterResponse(error)) return null;
      throw error;
    }
  },
);

export const getClusterFactoryFirstPage = cache(
  async (slug: string): Promise<GetClusterFactories200 | null> => {
    try {
      return await getClusterFactories(
        encodeURIComponent(slug),
        { limit: CLUSTER_FACTORY_PAGE_SIZE },
        revalidatedRequest,
      );
    } catch (error) {
      if (isMissingClusterResponse(error)) return null;
      throw error;
    }
  },
);

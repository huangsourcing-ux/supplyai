import { cache } from "react";

import {
  configureApiClient,
  getFactory,
  type GetFactory200,
} from "@chinasupply/api-client";

import { FACTORY_DETAIL_REVALIDATE_SECONDS } from "./factory-constants";
import { isMissingFactoryResponse } from "./factory-errors";

type RevalidatedRequestInit = RequestInit & {
  next: {
    revalidate: number;
  };
};

const revalidatedRequest: RevalidatedRequestInit = {
  cache: "force-cache",
  next: {
    revalidate: FACTORY_DETAIL_REVALIDATE_SECONDS,
  },
};

configureApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
});

export const getFactoryPageData = cache(
  async (slug: string): Promise<GetFactory200 | null> => {
    try {
      return await getFactory(slug, revalidatedRequest);
    } catch (error) {
      if (isMissingFactoryResponse(error)) return null;
      throw error;
    }
  },
);

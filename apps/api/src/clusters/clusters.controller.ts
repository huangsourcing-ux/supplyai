import {
  getClusterParamsSchema,
  getClustersQuerySchema,
} from "@chinasupply/schemas";
import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import type { z } from "zod";

import {
  getClusterRouteContract,
  getClustersRouteContract,
} from "../openapi/route-contracts.js";
import { ClustersService } from "./clusters.service.js";

const GetClustersQueryDto = getClustersRouteContract.nestDtos.query;
const GetClusterParamsDto = getClusterRouteContract.nestDtos.params;

if (GetClustersQueryDto === undefined || GetClusterParamsDto === undefined) {
  throw new Error("Cluster route contracts must define their request DTOs");
}

@Controller("clusters")
export class ClustersController {
  constructor(
    @Inject(ClustersService) private readonly clusters: ClustersService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(GetClustersQueryDto))
    query: z.output<typeof getClustersQuerySchema>,
  ) {
    return this.clusters.list(query);
  }

  @Get(":slug")
  getBySlug(
    @Param(new ZodValidationPipe(GetClusterParamsDto))
    params: z.output<typeof getClusterParamsSchema>,
  ) {
    return this.clusters.getBySlug(params.slug);
  }
}

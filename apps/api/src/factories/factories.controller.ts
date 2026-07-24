import {
  getClusterFactoriesParamsSchema,
  getClusterFactoriesQuerySchema,
  getFactoriesQuerySchema,
  getFactoryParamsSchema,
} from "@chinasupply/schemas";
import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import type { z } from "zod";

import {
  getClusterFactoriesRouteContract,
  getFactoriesRouteContract,
  getFactoryRouteContract,
} from "../openapi/route-contracts.js";
import { FactoriesService } from "./factories.service.js";

const GetClusterFactoriesParamsDto =
  getClusterFactoriesRouteContract.nestDtos.params;
const GetClusterFactoriesQueryDto =
  getClusterFactoriesRouteContract.nestDtos.query;
const GetFactoriesQueryDto = getFactoriesRouteContract.nestDtos.query;
const GetFactoryParamsDto = getFactoryRouteContract.nestDtos.params;

if (
  GetClusterFactoriesParamsDto === undefined ||
  GetClusterFactoriesQueryDto === undefined ||
  GetFactoriesQueryDto === undefined ||
  GetFactoryParamsDto === undefined
) {
  throw new Error("Factory route contracts must define their request DTOs");
}

@Controller("clusters")
export class ClusterFactoriesController {
  constructor(
    @Inject(FactoriesService) private readonly factories: FactoriesService,
  ) {}

  @Get(":slug/factories")
  list(
    @Param(new ZodValidationPipe(GetClusterFactoriesParamsDto))
    params: z.output<typeof getClusterFactoriesParamsSchema>,
    @Query(new ZodValidationPipe(GetClusterFactoriesQueryDto))
    query: z.output<typeof getClusterFactoriesQuerySchema>,
  ) {
    return this.factories.listByClusterSlug(params.slug, query);
  }
}

@Controller("factories")
export class FactoriesController {
  constructor(
    @Inject(FactoriesService) private readonly factories: FactoriesService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(GetFactoriesQueryDto))
    query: z.output<typeof getFactoriesQuerySchema>,
  ) {
    return this.factories.list(query);
  }

  @Get(":slug")
  getBySlug(
    @Param(new ZodValidationPipe(GetFactoryParamsDto))
    params: z.output<typeof getFactoryParamsSchema>,
  ) {
    return this.factories.getBySlug(params.slug);
  }
}

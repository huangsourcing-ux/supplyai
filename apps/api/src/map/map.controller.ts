import {
  getMapClusterBoundariesQuerySchema,
  getMapClusterPointsQuerySchema,
  getMapFactoriesQuerySchema,
} from "@chinasupply/schemas";
import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import type { z } from "zod";

import {
  getMapClusterBoundariesRouteContract,
  getMapClusterPointsRouteContract,
  getMapFactoriesRouteContract,
} from "../openapi/route-contracts.js";
import { MapService } from "./map.service.js";

const GetMapClusterPointsQueryDto =
  getMapClusterPointsRouteContract.nestDtos.query;
const GetMapClusterBoundariesQueryDto =
  getMapClusterBoundariesRouteContract.nestDtos.query;
const GetMapFactoriesQueryDto = getMapFactoriesRouteContract.nestDtos.query;

if (
  GetMapClusterPointsQueryDto === undefined ||
  GetMapClusterBoundariesQueryDto === undefined ||
  GetMapFactoriesQueryDto === undefined
) {
  throw new Error("Map route contracts must define their query DTOs");
}

@Controller("map")
export class MapController {
  constructor(@Inject(MapService) private readonly map: MapService) {}

  @Get("clusters/points")
  getClusterPoints(
    @Query(new ZodValidationPipe(GetMapClusterPointsQueryDto))
    query: z.output<typeof getMapClusterPointsQuerySchema>,
  ) {
    return this.map.getClusterPoints(query);
  }

  @Get("clusters/boundaries")
  getClusterBoundaries(
    @Query(new ZodValidationPipe(GetMapClusterBoundariesQueryDto))
    query: z.output<typeof getMapClusterBoundariesQuerySchema>,
  ) {
    return this.map.getClusterBoundaries(query);
  }

  @Get("factories")
  getFactories(
    @Query(new ZodValidationPipe(GetMapFactoriesQueryDto))
    query: z.output<typeof getMapFactoriesQuerySchema>,
  ) {
    return this.map.getFactories(query);
  }
}

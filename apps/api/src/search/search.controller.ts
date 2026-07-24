import { searchQuerySchema } from "@chinasupply/schemas";
import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import type { z } from "zod";

import { searchRouteContract } from "../openapi/route-contracts.js";
import { ClientIpThrottlerGuard } from "../rate-limit/client-ip-throttler.guard.js";
import { SearchService } from "./search.service.js";

const SearchQueryDto = searchRouteContract.nestDtos.query;

if (SearchQueryDto === undefined) {
  throw new Error("Search route contract must define a query DTO");
}

@Controller("search")
@UseGuards(ClientIpThrottlerGuard)
export class SearchController {
  constructor(@Inject(SearchService) private readonly search: SearchService) {}

  @Get()
  get(
    @Query(new ZodValidationPipe(SearchQueryDto))
    query: z.output<typeof searchQuerySchema>,
  ) {
    return this.search.search(query.q);
  }
}

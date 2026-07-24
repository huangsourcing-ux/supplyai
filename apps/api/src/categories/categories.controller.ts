import { Controller, Get, Inject, Query } from "@nestjs/common";
import { getCategoriesQuerySchema } from "@chinasupply/schemas";
import { ZodValidationPipe } from "nestjs-zod";
import type { z } from "zod";

import { getCategoriesRouteContract } from "../openapi/route-contracts.js";
import { CategoriesService } from "./categories.service.js";

const GetCategoriesQueryDto = getCategoriesRouteContract.nestDtos.query;
if (GetCategoriesQueryDto === undefined) {
  throw new Error("getCategories route contract must define a query DTO");
}

@Controller("categories")
export class CategoriesController {
  constructor(
    @Inject(CategoriesService) private readonly categories: CategoriesService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(GetCategoriesQueryDto))
    query: z.output<typeof getCategoriesQuerySchema>,
  ) {
    void query;
    return this.categories.list();
  }
}

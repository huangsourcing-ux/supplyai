import {
  createFavoriteBodySchema,
  deleteFavoriteParamsSchema,
  getFavoritesQuerySchema,
} from "@chinasupply/schemas";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ZodValidationPipe } from "nestjs-zod";
import type { z } from "zod";

import { UserAuthGuard } from "../auth/user-auth.guard.js";
import { getRouteContract } from "../openapi/route-contracts.js";
import { UserThrottlerGuard } from "../rate-limit/user-throttler.guard.js";
import { FavoritesService } from "./favorites.service.js";

const contracts = {
  create: getRouteContract("createFavorite"),
  delete: getRouteContract("deleteFavorite"),
  list: getRouteContract("getFavorites"),
};
const GetFavoritesQueryDto = contracts.list.nestDtos.query;
const CreateFavoriteBodyDto = contracts.create.nestDtos.body;
const DeleteFavoriteParamsDto = contracts.delete.nestDtos.params;
if (
  GetFavoritesQueryDto === undefined ||
  CreateFavoriteBodyDto === undefined ||
  DeleteFavoriteParamsDto === undefined
) {
  throw new Error("Favorite route contracts must define request DTOs");
}

function requireUserId(request: FastifyRequest): string {
  if (request.userId === undefined) {
    throw new UnauthorizedException();
  }
  return request.userId;
}

@Controller("favorites")
export class FavoritesController {
  constructor(
    @Inject(FavoritesService) private readonly favorites: FavoritesService,
  ) {}

  @Get()
  @UseGuards(UserAuthGuard)
  list(
    @Req() request: FastifyRequest,
    @Query(new ZodValidationPipe(GetFavoritesQueryDto))
    query: z.output<typeof getFavoritesQuerySchema>,
  ) {
    return this.favorites.list(requireUserId(request), query);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserAuthGuard, UserThrottlerGuard)
  create(
    @Req() request: FastifyRequest,
    @Body(new ZodValidationPipe(CreateFavoriteBodyDto))
    body: z.output<typeof createFavoriteBodySchema>,
  ) {
    return this.favorites.create(requireUserId(request), body);
  }

  @Delete(":targetType/:targetId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserAuthGuard, UserThrottlerGuard)
  delete(
    @Req() request: FastifyRequest,
    @Param(new ZodValidationPipe(DeleteFavoriteParamsDto))
    params: z.output<typeof deleteFavoriteParamsSchema>,
  ) {
    return this.favorites.delete(
      requireUserId(request),
      params.targetType,
      params.targetId,
    );
  }
}

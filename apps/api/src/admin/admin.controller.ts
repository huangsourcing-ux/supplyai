import {
  getAdminClustersQuerySchema,
  getAdminFactoriesQuerySchema,
  updateAdminClusterBodySchema,
  updateAdminFactoryBodySchema,
} from "@chinasupply/schemas";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ZodValidationPipe } from "nestjs-zod";
import type { z } from "zod";

import { AdminAuthGuard } from "../auth/admin-auth.guard.js";
import { getRouteContract } from "../openapi/route-contracts.js";
import { AdminService } from "./admin.service.js";

const contracts = {
  getCluster: getRouteContract("getAdminCluster"),
  getClusters: getRouteContract("getAdminClusters"),
  getFactories: getRouteContract("getAdminFactories"),
  getFactory: getRouteContract("getAdminFactory"),
  publishCluster: getRouteContract("publishAdminCluster"),
  publishFactory: getRouteContract("publishAdminFactory"),
  unpublishCluster: getRouteContract("unpublishAdminCluster"),
  unpublishFactory: getRouteContract("unpublishAdminFactory"),
  updateCluster: getRouteContract("updateAdminCluster"),
  updateFactory: getRouteContract("updateAdminFactory"),
  verifyFactory: getRouteContract("verifyAdminFactory"),
};

function requireDto(
  dto: (typeof contracts)[keyof typeof contracts]["nestDtos"]["params"],
  name: string,
) {
  if (dto === undefined) {
    throw new Error(`${name} route contract must define params`);
  }
  return dto;
}

const GetAdminClustersQueryDto = contracts.getClusters.nestDtos.query;
const GetAdminFactoriesQueryDto = contracts.getFactories.nestDtos.query;
const GetAdminClusterParamsDto = requireDto(
  contracts.getCluster.nestDtos.params,
  "getAdminCluster",
);
const UpdateAdminClusterParamsDto = requireDto(
  contracts.updateCluster.nestDtos.params,
  "updateAdminCluster",
);
const UpdateAdminClusterBodyDto = contracts.updateCluster.nestDtos.body;
const PublishAdminClusterParamsDto = requireDto(
  contracts.publishCluster.nestDtos.params,
  "publishAdminCluster",
);
const UnpublishAdminClusterParamsDto = requireDto(
  contracts.unpublishCluster.nestDtos.params,
  "unpublishAdminCluster",
);
const GetAdminFactoryParamsDto = requireDto(
  contracts.getFactory.nestDtos.params,
  "getAdminFactory",
);
const UpdateAdminFactoryParamsDto = requireDto(
  contracts.updateFactory.nestDtos.params,
  "updateAdminFactory",
);
const UpdateAdminFactoryBodyDto = contracts.updateFactory.nestDtos.body;
const PublishAdminFactoryParamsDto = requireDto(
  contracts.publishFactory.nestDtos.params,
  "publishAdminFactory",
);
const UnpublishAdminFactoryParamsDto = requireDto(
  contracts.unpublishFactory.nestDtos.params,
  "unpublishAdminFactory",
);
const VerifyAdminFactoryParamsDto = requireDto(
  contracts.verifyFactory.nestDtos.params,
  "verifyAdminFactory",
);

if (
  GetAdminClustersQueryDto === undefined ||
  GetAdminFactoriesQueryDto === undefined ||
  UpdateAdminClusterBodyDto === undefined ||
  UpdateAdminFactoryBodyDto === undefined
) {
  throw new Error("Admin route contracts must define their request DTOs");
}

type IdParams = { id: string };

export function getRequestOrigin(request: FastifyRequest): string {
  const host = request.headers.host;
  if (host === undefined || host.includes(",")) {
    throw new UnauthorizedException();
  }

  const forwardedProtocol = request.headers["x-forwarded-proto"];
  if (
    Array.isArray(forwardedProtocol) ||
    forwardedProtocol?.includes(",") === true
  ) {
    throw new UnauthorizedException();
  }

  const protocol = forwardedProtocol ?? request.protocol;
  if (protocol !== "http" && protocol !== "https") {
    throw new UnauthorizedException();
  }

  return new URL(`${protocol}://${host}`).origin;
}

@Controller("admin/clusters")
@UseGuards(AdminAuthGuard)
export class AdminClustersController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(GetAdminClustersQueryDto))
    query: z.output<typeof getAdminClustersQuerySchema>,
  ) {
    return this.admin.listClusters(query);
  }

  @Get(":id")
  get(
    @Param(new ZodValidationPipe(GetAdminClusterParamsDto))
    params: IdParams,
  ) {
    return this.admin.getCluster(params.id);
  }

  @Patch(":id")
  update(
    @Param(new ZodValidationPipe(UpdateAdminClusterParamsDto))
    params: IdParams,
    @Body(new ZodValidationPipe(UpdateAdminClusterBodyDto))
    body: z.output<typeof updateAdminClusterBodySchema>,
  ) {
    return this.admin.updateCluster(params.id, body);
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  publish(
    @Param(new ZodValidationPipe(PublishAdminClusterParamsDto))
    params: IdParams,
    @Req() request: FastifyRequest,
  ) {
    return this.admin.publishCluster(params.id, getRequestOrigin(request));
  }

  @Post(":id/unpublish")
  @HttpCode(HttpStatus.OK)
  unpublish(
    @Param(new ZodValidationPipe(UnpublishAdminClusterParamsDto))
    params: IdParams,
    @Req() request: FastifyRequest,
  ) {
    return this.admin.unpublishCluster(params.id, getRequestOrigin(request));
  }
}

@Controller("admin/factories")
@UseGuards(AdminAuthGuard)
export class AdminFactoriesController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(GetAdminFactoriesQueryDto))
    query: z.output<typeof getAdminFactoriesQuerySchema>,
  ) {
    return this.admin.listFactories(query);
  }

  @Get(":id")
  get(
    @Param(new ZodValidationPipe(GetAdminFactoryParamsDto))
    params: IdParams,
  ) {
    return this.admin.getFactory(params.id);
  }

  @Patch(":id")
  update(
    @Param(new ZodValidationPipe(UpdateAdminFactoryParamsDto))
    params: IdParams,
    @Body(new ZodValidationPipe(UpdateAdminFactoryBodyDto))
    body: z.output<typeof updateAdminFactoryBodySchema>,
  ) {
    return this.admin.updateFactory(params.id, body);
  }

  @Post(":id/verify")
  @HttpCode(HttpStatus.OK)
  verify(
    @Param(new ZodValidationPipe(VerifyAdminFactoryParamsDto))
    params: IdParams,
    @Req() request: FastifyRequest,
  ) {
    if (request.adminUserId === undefined) {
      throw new UnauthorizedException();
    }
    return this.admin.verifyFactory(params.id, request.adminUserId);
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  publish(
    @Param(new ZodValidationPipe(PublishAdminFactoryParamsDto))
    params: IdParams,
    @Req() request: FastifyRequest,
  ) {
    return this.admin.publishFactory(params.id, getRequestOrigin(request));
  }

  @Post(":id/unpublish")
  @HttpCode(HttpStatus.OK)
  unpublish(
    @Param(new ZodValidationPipe(UnpublishAdminFactoryParamsDto))
    params: IdParams,
    @Req() request: FastifyRequest,
  ) {
    return this.admin.unpublishFactory(params.id, getRequestOrigin(request));
  }
}

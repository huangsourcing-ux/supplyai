import { updateMeBodySchema } from "@chinasupply/schemas";
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
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
import { AccountService } from "./account.service.js";

const UpdateMeBodyDto = getRouteContract("updateMe").nestDtos.body;
if (UpdateMeBodyDto === undefined) {
  throw new Error("updateMe route contract must define a body DTO");
}

function requireUserId(request: FastifyRequest): string {
  if (request.userId === undefined) {
    throw new UnauthorizedException();
  }
  return request.userId;
}

@Controller("me")
@UseGuards(UserAuthGuard, UserThrottlerGuard)
export class AccountController {
  constructor(
    @Inject(AccountService) private readonly account: AccountService,
  ) {}

  @Patch()
  update(
    @Req() request: FastifyRequest,
    @Body(new ZodValidationPipe(UpdateMeBodyDto))
    body: z.output<typeof updateMeBodySchema>,
  ) {
    return this.account.update(requireUserId(request), body);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  delete(@Req() request: FastifyRequest) {
    return this.account.delete(requireUserId(request));
  }
}

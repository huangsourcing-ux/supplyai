import { Module } from "@nestjs/common";

import { RUNTIME_CONFIG } from "../config/runtime-config.module.js";
import {
  AdminAuthGuard,
  CLERK_TOKEN_VERIFIER,
  createClerkTokenVerifier,
} from "./admin-auth.guard.js";

@Module({
  exports: [AdminAuthGuard, CLERK_TOKEN_VERIFIER],
  providers: [
    AdminAuthGuard,
    {
      inject: [RUNTIME_CONFIG],
      provide: CLERK_TOKEN_VERIFIER,
      useFactory: createClerkTokenVerifier,
    },
  ],
})
export class AuthModule {}

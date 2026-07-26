import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { RUNTIME_CONFIG } from "../config/runtime-config.module.js";
import {
  AdminAuthGuard,
  CLERK_TOKEN_VERIFIER,
  createClerkTokenVerifier,
} from "./admin-auth.guard.js";
import { UserAuthGuard } from "./user-auth.guard.js";

@Module({
  exports: [AdminAuthGuard, CLERK_TOKEN_VERIFIER, UserAuthGuard],
  imports: [DatabaseModule],
  providers: [
    AdminAuthGuard,
    UserAuthGuard,
    {
      inject: [RUNTIME_CONFIG],
      provide: CLERK_TOKEN_VERIFIER,
      useFactory: createClerkTokenVerifier,
    },
  ],
})
export class AuthModule {}

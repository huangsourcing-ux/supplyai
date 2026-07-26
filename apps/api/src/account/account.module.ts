import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { AccountController } from "./account.controller.js";
import { AccountService } from "./account.service.js";
import {
  CLERK_USER_DELETER,
  createClerkUserDeleter,
} from "./clerk-user-deleter.js";

@Module({
  controllers: [AccountController],
  imports: [AuthModule, DatabaseModule, RateLimitModule],
  providers: [
    AccountService,
    {
      inject: [RUNTIME_CONFIG],
      provide: CLERK_USER_DELETER,
      useFactory: (config: RuntimeConfig) => createClerkUserDeleter(config),
    },
  ],
})
export class AccountModule {}

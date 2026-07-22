import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { createRedisOptions } from "./common/redis/redis-options.js";
import {
  RUNTIME_CONFIG,
  RuntimeConfigModule,
  type RuntimeConfig,
} from "./config/runtime-config.module.js";
import { SYSTEM_QUEUE } from "./queue/system.constants.js";
import { SystemProcessor } from "./queue/system.processor.js";

@Module({
  imports: [
    RuntimeConfigModule,
    BullModule.forRootAsync({
      inject: [RUNTIME_CONFIG],
      useFactory: (config: RuntimeConfig) => ({
        connection: createRedisOptions(config.REDIS_URL, null),
      }),
    }),
    BullModule.registerQueue({ name: SYSTEM_QUEUE }),
  ],
  providers: [SystemProcessor],
})
export class WorkerModule {}

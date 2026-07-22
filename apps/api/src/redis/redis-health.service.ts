import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

import { createRedisOptions } from "../common/redis/redis-options.js";
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";

@Injectable()
export class RedisHealthService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.client = new Redis({
      ...createRedisOptions(config.REDIS_URL, 1),
      connectTimeout: 3_000,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    this.client.on("error", () => {
      // Readiness reports connectivity without logging connection details.
    });
  }

  async ping(): Promise<void> {
    if (this.client.status === "wait" || this.client.status === "end") {
      await this.client.connect();
    }

    const response = await this.client.ping();
    if (response !== "PONG") {
      throw new Error("Redis did not return PONG");
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect(false);
  }
}

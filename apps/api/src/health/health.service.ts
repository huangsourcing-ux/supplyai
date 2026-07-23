import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import { RedisHealthService } from "../redis/redis-health.service.js";

export interface ReadinessResult {
  checks: {
    postgres: "up";
    redis: "up";
  };
  status: "ready";
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RedisHealthService) private readonly redis: RedisHealthService,
  ) {}

  live(): { status: "ok" } {
    return { status: "ok" };
  }

  async ready(): Promise<ReadinessResult> {
    const checks = await Promise.allSettled([
      this.database.ping(),
      this.redis.ping(),
    ]);
    const failedDependencies = ["postgres", "redis"].filter(
      (_dependency, index) => checks[index]?.status === "rejected",
    );

    if (failedDependencies.length > 0) {
      this.logger.warn(
        `Readiness check failed: ${failedDependencies.join(", ")}`,
      );
      throw new ServiceUnavailableException();
    }

    return {
      checks: {
        postgres: "up",
        redis: "up",
      },
      status: "ready",
    };
  }
}

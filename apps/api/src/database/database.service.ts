import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";

import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.pool = new Pool({
      application_name: "chinasupply-api",
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 10_000,
      max: 5,
    });
  }

  async ping(): Promise<void> {
    await this.pool.query("select 1");
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

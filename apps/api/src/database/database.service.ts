import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";
import * as coreSchema from "./schema.js";

export type CoreDatabase = NodePgDatabase<typeof coreSchema>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: CoreDatabase;
  private readonly pool: Pool;

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.pool = new Pool({
      application_name: "chinasupply-api",
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 10_000,
      max: 5,
    });
    this.db = drizzle(this.pool, { schema: coreSchema });
  }

  async ping(): Promise<void> {
    await this.pool.query("select 1");
  }

  async postgresServerMajor(): Promise<number> {
    const result = await this.pool.query<{ serverVersionNum: string }>(
      "select current_setting('server_version_num') as \"serverVersionNum\"",
    );
    const version = result.rows[0]?.serverVersionNum;
    if (version === undefined) {
      throw new Error("PostgreSQL did not return server_version_num");
    }
    return Math.floor(Number.parseInt(version, 10) / 10_000);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

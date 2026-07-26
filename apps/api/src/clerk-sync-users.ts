import { createClerkClient } from "@clerk/backend";
import { parseClerkUserSyncCliEnv } from "@chinasupply/config/env/api";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as coreSchema from "./database/schema.js";
import {
  assertClerkUserSyncEnvironment,
  syncClerkUsers,
} from "./users/sync-clerk-users.js";

async function main(): Promise<void> {
  const argumentsList = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  assertClerkUserSyncEnvironment(process.env.APP_ENV, argumentsList);
  const config = parseClerkUserSyncCliEnv(process.env);
  const pool = new Pool({
    application_name: "chinasupply-clerk-user-sync",
    connectionString: config.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    max: 1,
  });
  const database = drizzle(pool, { schema: coreSchema });
  const clerk = createClerkClient({
    secretKey: config.CLERK_SECRET_KEY,
    telemetry: { disabled: true },
  });

  try {
    const result = await syncClerkUsers({ clerk, database });
    console.log(JSON.stringify({ environment: config.APP_ENV, ...result }));
  } finally {
    await pool.end();
  }
}

void main().catch(() => {
  console.error("Clerk user sync failed");
  process.exitCode = 1;
});

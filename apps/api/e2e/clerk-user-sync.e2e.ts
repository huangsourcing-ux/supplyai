import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { nanoid } from "nanoid";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as coreSchema from "../src/database/schema.js";
import {
  syncClerkUsers,
  type ClerkUserListSource,
  type ClerkUserSnapshot,
} from "../src/users/sync-clerk-users.js";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const postgresPort = 5432;
const credentials = {
  database: "chinasupply_clerk_sync_e2e",
  password: "chinasupply_clerk_sync_e2e_only",
  user: "chinasupply",
};

function runMigration(databaseUrl: string): void {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["--filter", "@chinasupply/api", "db:migrate"],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, APP_ENV: "local", DATABASE_URL: databaseUrl },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      ["Core migration failed", result.stdout, result.stderr].join("\n"),
    );
  }
}

function userSnapshot(
  id: string,
  input: Partial<ClerkUserSnapshot> = {},
): ClerkUserSnapshot {
  return {
    emailAddresses: [{ emailAddress: `${id}@example.test`, id: `email_${id}` }],
    firstName: "Ada",
    id,
    lastName: "Lovelace",
    primaryEmailAddressId: `email_${id}`,
    ...input,
  };
}

function clerkSource(users: ClerkUserSnapshot[]): ClerkUserListSource {
  return {
    users: {
      getUserList: async ({ limit, offset }) => ({
        data: users.slice(offset, offset + limit),
        totalCount: users.length,
      }),
    },
  };
}

describe.sequential("M3-T3 Clerk user sync", () => {
  let pool: Pool;
  let postgres: StartedTestContainer;

  beforeAll(async () => {
    postgres = await new GenericContainer("postgis/postgis:17-3.5")
      .withEnvironment({
        POSTGRES_DB: credentials.database,
        POSTGRES_PASSWORD: credentials.password,
        POSTGRES_USER: credentials.user,
      })
      .withExposedPorts(postgresPort)
      .withPlatform("linux/amd64")
      .withStartupTimeout(120_000)
      .withWaitStrategy(
        Wait.forLogMessage(/database system is ready to accept connections/, 2),
      )
      .start();
    const databaseUrl = `postgresql://${credentials.user}:${credentials.password}@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/${credentials.database}`;
    runMigration(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
  }, 180_000);

  beforeEach(async () => {
    await pool.query("delete from favorites");
    await pool.query("delete from webhook_events");
    await pool.query("delete from users");
  });

  afterAll(async () => {
    await pool?.end();
    await postgres?.stop();
  });

  it("inserts only missing users and preserves active rows and tombstones", async () => {
    const activeId = "user_existing_active";
    const deletedId = "user_existing_deleted";
    const newId = "user_missing_from_db";
    const deletedAt = new Date("2026-07-20T12:00:00.000Z");
    const favoriteId = nanoid(21);

    await pool.query(
      `insert into users (id, email, name, locale, deleted_at)
       values
         ($1, 'original-active@example.test', 'Original Active', 'zh', null),
         ($2, 'original-deleted@example.test', 'Original Deleted', 'en', $3)`,
      [activeId, deletedId, deletedAt],
    );
    await pool.query(
      `insert into favorites (id, user_id, target_type, target_id)
       values ($1, $2, 'cluster', $3)`,
      [favoriteId, activeId, nanoid(21)],
    );
    await pool.query(
      `insert into webhook_events (id, type, processed_at)
       values ('msg_existing_receipt', 'user.updated', now())`,
    );

    const clerk = clerkSource([
      userSnapshot(activeId, {
        emailAddresses: [
          { emailAddress: "changed-active@example.test", id: "active_email" },
        ],
        firstName: "Changed",
        lastName: "Active",
        primaryEmailAddressId: "active_email",
      }),
      userSnapshot(deletedId, {
        emailAddresses: [
          {
            emailAddress: "changed-deleted@example.test",
            id: "deleted_email",
          },
        ],
        firstName: "Changed",
        lastName: "Deleted",
        primaryEmailAddressId: "deleted_email",
      }),
      userSnapshot(newId, {
        firstName: " New ",
        lastName: " Buyer ",
      }),
    ]);
    const database = drizzle(pool, { schema: coreSchema });

    const first = await syncClerkUsers({ clerk, database });
    expect(first).toEqual({ existing: 2, fetched: 3, inserted: 1 });

    const synchronized = await pool.query<{
      deleted_at: Date | null;
      email: string;
      id: string;
      locale: string;
      name: string | null;
    }>(
      `select id, email, name, locale, deleted_at
       from users
       order by id`,
    );
    expect(synchronized.rows).toEqual([
      {
        deleted_at: null,
        email: "original-active@example.test",
        id: activeId,
        locale: "zh",
        name: "Original Active",
      },
      {
        deleted_at: deletedAt,
        email: "original-deleted@example.test",
        id: deletedId,
        locale: "en",
        name: "Original Deleted",
      },
      {
        deleted_at: null,
        email: `${newId}@example.test`,
        id: newId,
        locale: "en",
        name: "New Buyer",
      },
    ]);
    expect(
      (await pool.query("select count(*)::int as count from favorites")).rows,
    ).toEqual([{ count: 1 }]);
    expect(
      (await pool.query("select count(*)::int as count from webhook_events"))
        .rows,
    ).toEqual([{ count: 1 }]);

    const second = await syncClerkUsers({ clerk, database });
    expect(second).toEqual({ existing: 3, fetched: 3, inserted: 0 });
  });

  it("validates every Clerk user before opening the write transaction", async () => {
    const database = drizzle(pool, { schema: coreSchema });
    const clerk = clerkSource([
      userSnapshot("user_valid"),
      userSnapshot("user_invalid", {
        primaryEmailAddressId: null,
      }),
    ]);

    await expect(syncClerkUsers({ clerk, database })).rejects.toThrow(
      "1 user(s) do not have a primary email",
    );
    expect(
      (await pool.query("select count(*)::int as count from users")).rows,
    ).toEqual([{ count: 0 }]);
  });
});

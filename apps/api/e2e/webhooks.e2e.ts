import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Controller, Get, Module, Req, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyRequest } from "fastify";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  CLERK_USER_DELETER,
  type ClerkUserDeleter,
} from "../src/account/clerk-user-deleter.js";
import { AppModule } from "../src/app.module.js";
import {
  CLERK_TOKEN_VERIFIER,
  type ClerkTokenVerifier,
} from "../src/auth/admin-auth.guard.js";
import { AuthModule } from "../src/auth/auth.module.js";
import { UserAuthGuard } from "../src/auth/user-auth.guard.js";
import { registerEdgeProxy } from "../src/common/http/edge-proxy.js";
import { configureHttpApplication } from "../src/http-application.js";
import { DatabaseModule } from "../src/database/database.module.js";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const postgresPort = 5432;
const redisPort = 6379;
const credentials = {
  database: "chinasupply_webhooks_e2e",
  password: "chinasupply_webhooks_e2e_only",
  user: "chinasupply",
};
const signingKey = Buffer.from("chinasupply-webhook-e2e-signing-key");
const signingSecret = `whsec_${signingKey.toString("base64")}`;
const accountDeletionUserId = "user_account_deletion_e2e";
const userId = "user_webhook_e2e";

@Controller("auth-probe")
@UseGuards(UserAuthGuard)
class UserAuthProbeController {
  @Get()
  get(@Req() request: FastifyRequest) {
    return { userId: request.userId };
  }
}

@Module({
  controllers: [UserAuthProbeController],
  imports: [AuthModule, DatabaseModule],
})
class UserAuthProbeModule {}

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

function userEvent(
  type: "user.created" | "user.updated",
  input: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    primaryEmailId?: string;
  } = {},
) {
  const primaryEmailId = input.primaryEmailId ?? "idn_primary";
  return {
    data: {
      email_addresses: [
        {
          email_address: input.email ?? "buyer@example.test",
          id: "idn_primary",
          provider_extra: true,
        },
        {
          email_address: "secondary@example.test",
          id: "idn_secondary",
        },
      ],
      first_name: input.firstName ?? "Ada",
      id: userId,
      last_name: input.lastName ?? "Lovelace",
      primary_email_address_id: primaryEmailId,
      provider_extra: true,
    },
    instance_id: "ins_webhook_e2e",
    object: "event",
    provider_extra: true,
    timestamp: Date.now(),
    type,
  };
}

function deletedEvent(id = userId) {
  return {
    data: { deleted: true, id, object: "user" },
    instance_id: "ins_webhook_e2e",
    object: "event",
    timestamp: Date.now(),
    type: "user.deleted",
  };
}

function signedHeaders(
  messageId: string,
  payload: string,
  timestamp = new Date(),
) {
  const timestampSeconds = Math.floor(timestamp.getTime() / 1000);
  const signature = createHmac("sha256", signingKey)
    .update(`${messageId}.${timestampSeconds}.${payload}`)
    .digest("base64");
  return {
    "content-type": "application/json",
    "svix-id": messageId,
    "svix-signature": `v1,${signature}`,
    "svix-timestamp": String(timestampSeconds),
  };
}

describe.sequential("M3-T8 account lifecycle and webhook e2e", () => {
  let app: NestFastifyApplication;
  let pool: Pool;
  let postgres: StartedTestContainer;
  let redis: StartedTestContainer;
  const previousEnvironment = { ...process.env };
  const deleteClerkUser = vi.fn<ClerkUserDeleter>(async () => undefined);

  beforeAll(async () => {
    [postgres, redis] = await Promise.all([
      new GenericContainer("postgis/postgis:17-3.5")
        .withEnvironment({
          POSTGRES_DB: credentials.database,
          POSTGRES_PASSWORD: credentials.password,
          POSTGRES_USER: credentials.user,
        })
        .withExposedPorts(postgresPort)
        .withPlatform("linux/amd64")
        .withStartupTimeout(120_000)
        .withWaitStrategy(
          Wait.forLogMessage(
            /database system is ready to accept connections/,
            2,
          ),
        )
        .start(),
      new GenericContainer("redis:7.4-alpine")
        .withExposedPorts(redisPort)
        .withStartupTimeout(60_000)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
        .start(),
    ]);

    const databaseUrl = `postgresql://${credentials.user}:${credentials.password}@${postgres.getHost()}:${postgres.getMappedPort(postgresPort)}/${credentials.database}`;
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(redisPort)}`;
    runMigration(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    Object.assign(process.env, {
      APP_ENV: "local",
      CLERK_WEBHOOK_SECRET: signingSecret,
      DATABASE_URL: databaseUrl,
      PORT: "3001",
      R2_CDN_BASE_URL: "https://media.example.test",
      REDIS_URL: redisUrl,
      WEB_ORIGIN: "http://localhost:3000",
    });

    const tokenVerifier: ClerkTokenVerifier = async (token) => {
      if (!token.startsWith("token-")) {
        throw new Error("invalid token");
      }
      return { sub: token.slice("token-".length) };
    };
    const testingModule = await Test.createTestingModule({
      imports: [AppModule, UserAuthProbeModule],
    })
      .overrideProvider(CLERK_TOKEN_VERIFIER)
      .useValue(tokenVerifier)
      .overrideProvider(CLERK_USER_DELETER)
      .useValue(deleteClerkUser)
      .compile();
    const adapter = new FastifyAdapter({ trustProxy: false });
    registerEdgeProxy(adapter.getInstance(), { appEnvironment: "local" });
    app = testingModule.createNestApplication<NestFastifyApplication>(adapter, {
      rawBody: true,
    });
    configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await Promise.all([postgres?.stop(), redis?.stop()]);
    process.env = previousEnvironment;
  });

  it("rejects unsigned, tampered, stale, and invalid events without writes", async () => {
    const createdPayload = JSON.stringify(userEvent("user.created"));
    const unsigned = await app.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: createdPayload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(unsigned.statusCode).toBe(400);
    expect(unsigned.json()).toMatchObject({
      data: null,
      error: { code: "VALIDATION_ERROR" },
    });

    const tamperedId = "msg_tampered";
    const tampered = await app.inject({
      headers: signedHeaders(tamperedId, createdPayload),
      method: "POST",
      payload: `${createdPayload} `,
      url: "/api/v1/webhooks/clerk",
    });
    expect(tampered.statusCode).toBe(400);

    const staleId = "msg_stale";
    const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000);
    const stale = await app.inject({
      headers: signedHeaders(staleId, createdPayload, staleTimestamp),
      method: "POST",
      payload: createdPayload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(stale.statusCode).toBe(400);

    const invalidId = "msg_invalid_primary";
    const invalidPayload = JSON.stringify(
      userEvent("user.created", { primaryEmailId: "idn_missing" }),
    );
    const invalid = await app.inject({
      headers: signedHeaders(invalidId, invalidPayload),
      method: "POST",
      payload: invalidPayload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: [
          expect.objectContaining({
            path: ["data", "primary_email_address_id"],
          }),
        ],
      },
    });

    const events = await pool.query<{ count: string }>(
      "select count(*)::text as count from webhook_events",
    );
    expect(events.rows[0]?.count).toBe("0");
  });

  it("uses the exact raw body and processes a concurrent replay once", async () => {
    const messageId = "msg_created";
    const payload = `${JSON.stringify(userEvent("user.created"), null, 2)}\n`;
    const request = {
      headers: signedHeaders(messageId, payload),
      method: "POST" as const,
      payload,
      url: "/api/v1/webhooks/clerk",
    };
    const responses = await Promise.all([
      app.inject(request),
      app.inject(request),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([
      200, 200,
    ]);
    expect(responses.map((response) => response.json().data)).toEqual(
      expect.arrayContaining([
        { duplicate: false, processed: true },
        { duplicate: true, processed: false },
      ]),
    );

    const replay = await app.inject(request);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({
      data: { duplicate: true, processed: false },
      error: null,
      meta: {},
    });

    const synchronized = await pool.query<{
      deleted_at: Date | null;
      email: string;
      locale: string;
      name: string | null;
    }>("select email, name, locale, deleted_at from users where id = $1", [
      userId,
    ]);
    expect(synchronized.rows).toEqual([
      {
        deleted_at: null,
        email: "buyer@example.test",
        locale: "en",
        name: "Ada Lovelace",
      },
    ]);
    const eventCount = await pool.query<{ count: string }>(
      "select count(*)::text as count from webhook_events where id = $1",
      [messageId],
    );
    expect(eventCount.rows[0]?.count).toBe("1");

    const active = await app.inject({
      headers: { authorization: `Bearer token-${userId}` },
      method: "GET",
      url: "/api/v1/auth-probe",
    });
    expect(active.statusCode).toBe(200);
    expect(active.json().data).toEqual({ userId });
  });

  it("updates Clerk fields while preserving the local locale", async () => {
    await pool.query("update users set locale = 'zh' where id = $1", [userId]);
    const messageId = "msg_updated";
    const payload = JSON.stringify(
      userEvent("user.updated", {
        email: "updated@example.test",
        firstName: " Grace ",
        lastName: " Hopper ",
      }),
    );
    const response = await app.inject({
      headers: signedHeaders(messageId, payload),
      method: "POST",
      payload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      duplicate: false,
      processed: true,
    });

    const updated = await pool.query<{
      email: string;
      locale: string;
      name: string | null;
    }>("select email, name, locale from users where id = $1", [userId]);
    expect(updated.rows).toEqual([
      {
        email: "updated@example.test",
        locale: "zh",
        name: "Grace Hopper",
      },
    ]);
  });

  it("completes DELETE /me through the deletion webhook and blocks the old JWT", async () => {
    await pool.query(
      `insert into users (id, email, name)
       values ($1, 'delete-flow@example.test', 'Delete Flow')`,
      [accountDeletionUserId],
    );
    await pool.query(
      `insert into favorites (id, user_id, target_type, target_id)
       values ('888888888888888888888', $1, 'factory', '999999999999999999999')`,
      [accountDeletionUserId],
    );

    const requested = await app.inject({
      headers: { authorization: `Bearer token-${accountDeletionUserId}` },
      method: "DELETE",
      url: "/api/v1/me",
    });
    expect(requested.statusCode).toBe(200);
    expect(requested.json()).toEqual({
      data: { deletionRequested: true },
      error: null,
      meta: {},
    });
    expect(deleteClerkUser).toHaveBeenCalledOnce();
    expect(deleteClerkUser).toHaveBeenCalledWith(accountDeletionUserId);

    const beforeWebhook = await pool.query<{
      deleted_at: Date | null;
      favorite_count: number;
    }>(
      `select u.deleted_at, count(f.id)::integer as favorite_count
       from users u
       left join favorites f on f.user_id = u.id
       where u.id = $1
       group by u.id`,
      [accountDeletionUserId],
    );
    expect(beforeWebhook.rows[0]).toMatchObject({
      deleted_at: null,
      favorite_count: 1,
    });

    const messageId = "msg_account_deletion_flow";
    const payload = JSON.stringify(deletedEvent(accountDeletionUserId));
    const webhookRequest = {
      headers: signedHeaders(messageId, payload),
      method: "POST" as const,
      payload,
      url: "/api/v1/webhooks/clerk",
    };
    const processed = await app.inject(webhookRequest);
    expect(processed.statusCode).toBe(200);
    expect(processed.json()).toEqual({
      data: { duplicate: false, processed: true },
      error: null,
      meta: {},
    });

    const replay = await app.inject(webhookRequest);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({
      data: { duplicate: true, processed: false },
      error: null,
      meta: {},
    });

    const afterWebhook = await pool.query<{
      deleted_at: Date | null;
      event_count: number;
      favorite_count: number;
    }>(
      `select u.deleted_at,
              count(distinct f.id)::integer as favorite_count,
              count(distinct e.id)::integer as event_count
       from users u
       left join favorites f on f.user_id = u.id
       left join webhook_events e on e.id = $2
       where u.id = $1
       group by u.id`,
      [accountDeletionUserId, messageId],
    );
    expect(afterWebhook.rows[0]?.deleted_at).toBeInstanceOf(Date);
    expect(afterWebhook.rows[0]?.favorite_count).toBe(0);
    expect(afterWebhook.rows[0]?.event_count).toBe(1);

    const blocked = await app.inject({
      headers: { authorization: `Bearer token-${accountDeletionUserId}` },
      method: "GET",
      url: "/api/v1/favorites",
    });
    expect(blocked.statusCode).toBe(401);
    expect(blocked.json()).toMatchObject({
      data: null,
      error: { code: "UNAUTHORIZED" },
      meta: null,
    });
  });

  it("soft-deletes the user, hard-deletes favorites, and never resurrects", async () => {
    await pool.query(
      `insert into favorites (id, user_id, target_type, target_id)
       values ($1, $2, 'factory', $3)`,
      ["fav000000000000000000", userId, "fac000000000000000000"],
    );
    const messageId = "msg_deleted";
    const payload = JSON.stringify(deletedEvent());
    const response = await app.inject({
      headers: signedHeaders(messageId, payload),
      method: "POST",
      payload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      duplicate: false,
      processed: true,
    });

    const deletion = await pool.query<{
      deleted_at: Date | null;
      favorite_count: number;
    }>(
      `select u.deleted_at,
              count(f.id)::integer as favorite_count
       from users u
       left join favorites f on f.user_id = u.id
       where u.id = $1
       group by u.id`,
      [userId],
    );
    expect(deletion.rows[0]?.deleted_at).toBeInstanceOf(Date);
    expect(deletion.rows[0]?.favorite_count).toBe(0);

    const replay = await app.inject({
      headers: signedHeaders(messageId, payload),
      method: "POST",
      payload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(replay.json().data).toEqual({ duplicate: true, processed: false });

    const lateUpdateId = "msg_late_update";
    const lateUpdatePayload = JSON.stringify(
      userEvent("user.updated", { email: "late@example.test" }),
    );
    const lateUpdate = await app.inject({
      headers: signedHeaders(lateUpdateId, lateUpdatePayload),
      method: "POST",
      payload: lateUpdatePayload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(lateUpdate.statusCode).toBe(200);
    const tombstone = await pool.query<{ deleted_at: Date | null }>(
      "select deleted_at from users where id = $1",
      [userId],
    );
    expect(tombstone.rows[0]?.deleted_at).toBeInstanceOf(Date);

    const deletedAccess = await app.inject({
      headers: { authorization: `Bearer token-${userId}` },
      method: "GET",
      url: "/api/v1/auth-probe",
    });
    expect(deletedAccess.statusCode).toBe(401);
    expect(deletedAccess.json()).toMatchObject({
      data: null,
      error: { code: "UNAUTHORIZED" },
    });

    const missingAccess = await app.inject({
      headers: { authorization: "Bearer token-user_missing" },
      method: "GET",
      url: "/api/v1/auth-probe",
    });
    expect(missingAccess.statusCode).toBe(401);
  });

  it("rolls back an unknown deletion so Clerk can retry", async () => {
    const messageId = "msg_unknown_deleted";
    const payload = JSON.stringify(deletedEvent("user_unknown"));
    const response = await app.inject({
      headers: signedHeaders(messageId, payload),
      method: "POST",
      payload,
      url: "/api/v1/webhooks/clerk",
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      data: null,
      error: { code: "INTERNAL" },
    });

    const stored = await pool.query<{ count: string }>(
      "select count(*)::text as count from webhook_events where id = $1",
      [messageId],
    );
    expect(stored.rows[0]?.count).toBe("0");
  });
});

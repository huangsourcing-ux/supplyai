# ChinaSupply.AI API and worker

This workspace builds two Node.js entrypoints:

- `dist/main.js`: NestJS + Fastify HTTP API
- `dist/worker.js`: Nest application context hosting BullMQ consumers

Copy `.env.example` to `.env.local`, build the package, then use `start:api`
and `start:worker` in separate terminals. `system:ping` enqueues a test job and
waits up to 15 seconds for the worker result.

Health endpoints remain outside the business prefix:

- `GET /health/live` does not access external dependencies.
- `GET /health/ready` checks PostgreSQL and Redis.
- `GET /health/edge` is a no-store Cloudflare diagnostic and returns the
  validated client IP.

Outside local development, every route except live/ready requires the static
Cloudflare edge credential. The API ignores forwarded proxy chains and accepts
only a single valid `CF-Connecting-IP` after that credential succeeds. Direct
Railway access to protected routes returns the standard `FORBIDDEN` envelope.

M1-T1 owns the Drizzle core schema and migrations. Run
`pnpm release:migrate:core` before starting the API/Worker against a new
database; builds and application startup never apply migrations implicitly.
M1-T7 adds the private-R2-backed `import:clusters` and `import:factories`
commands plus the Worker consumer. Their fixed CSV/JSON contracts, object
paths, report semantics, and operating procedure are documented in
`docs/operations/data-imports.md`. M5-T3 adds the reusable
`regenerate:search-text` system job. `seed:real` enqueues it only when an
existing category's name or aliases actually changes, and waits while the
Worker rebuilds that category and all related cluster/factory search columns.
M1-T6 rate-limits each public search and MAP route independently at 60 requests
per minute per validated client IP, using an atomic Redis rolling window shared
by all API instances. Redis failures fail closed. Successful MAP responses use
`Cache-Control: public, max-age=0, s-maxage=3600`; API errors are `no-store`.
The internal Cloudflare purge client is reserved for M5-T3 and is never invoked
automatically. M3-T2 implements `POST /api/v1/webhooks/clerk` with Nest/Fastify
raw-body preservation, Clerk signature verification, and transactional
`webhook_events` idempotency. Created and updated users are synchronized into
the core `users` table; deletion keeps the user tombstone and hard-deletes its
favorites. `UserAuthGuard` rejects missing or soft-deleted users and is reserved
for the M3-T4 favorites/account controllers; the existing Admin guard remains
independent. M0-T7 adds Sentry to both
entrypoints: bootstrap failures and global API exceptions are captured, and
`pnpm --filter @chinasupply/api sentry:smoke` provides the controlled staging
verification command.

`CLERK_WEBHOOK_SECRET` is required by non-local API HTTP deployments but not by
the Worker. Store the real value only in the API service's encrypted platform
configuration. The Clerk endpoint must use the public Cloudflare hostname and
subscribe only to `user.created`, `user.updated`, and `user.deleted`.

M3-T3 provides the one-time `pnpm clerk:sync-users` backfill for users created
before the webhook endpoint became active. It reads Clerk users in 500-row
pages and inserts only missing core `users` rows; conflicts are left untouched,
so existing locale values and deletion tombstones cannot be overwritten or
reactivated. The command never deletes rows, modifies favorites, or creates
synthetic webhook receipts. Local runs accept no arguments, staging requires
the exact `--confirm-staging` argument, and production is always rejected
before a Clerk or PostgreSQL connection is opened. Successful output contains
only environment and aggregate fetched/inserted/existing counts.

M3-T4 exposes the authenticated `GET/POST/DELETE /api/v1/favorites` and
`PATCH/DELETE /api/v1/me` routes. Favorites use stable `created_at DESC, id
DESC` cursor pagination and return `target: null` when a previously saved
entity is no longer public. New favorites require a published target and are
idempotent under concurrent requests. User mutations share the Redis-backed
60 requests/minute budget independently per user and route. Account deletion
requests Clerk deletion first; the signed `user.deleted` webhook remains the
only path that tombstones the local user and hard-deletes favorites.

Railway uses the shared root `railway.json` for the API-only build. Its start
command dispatches to the distinct `start:api` or `start:worker` script from
the service's non-secret `SERVICE_ROLE`; only `api` receives a public domain
and `/health/ready` deployment check. Both services track `main` through
Railway's GitHub autodeploy integration with **Wait for CI** enabled, so a
commit is not built or released until all required GitHub checks succeed.

Run the API test suites from the repository root:

```bash
pnpm --filter @chinasupply/api test:unit
pnpm --filter @chinasupply/api test:e2e
```

The e2e suite requires a working Docker-compatible container runtime. It starts
the locked PostGIS and Redis images with Testcontainers and never uses staging
or production credentials.

Sentry environment, release, deployment variables, and smoke-test evidence are
documented in `docs/operations/sentry.md`. The trusted-edge and R2 boundaries
are documented in `docs/operations/cloudflare-maptiler.md`.

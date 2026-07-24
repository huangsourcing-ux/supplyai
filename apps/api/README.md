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
M1-T6 rate-limits each public search and MAP route independently at 60 requests
per minute per validated client IP, using an atomic Redis rolling window shared
by all API instances. Redis failures fail closed. Successful MAP responses use
`Cache-Control: public, max-age=0, s-maxage=3600`; API errors are `no-store`.
The internal Cloudflare purge client is reserved for M5-T3 and is never invoked
automatically. Authentication remains in its later task package. M0-T7 adds
Sentry to both entrypoints: bootstrap failures and global API exceptions are captured, and
`pnpm --filter @chinasupply/api sentry:smoke` provides the controlled staging
verification command.

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

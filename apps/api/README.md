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

M0-T4 does not own Drizzle schema/migrations, business endpoints, OpenAPI,
authentication, rate limiting, Sentry, or Cloudflare configuration.

Railway uses the shared root `railway.json` for the API-only build. Its start
command dispatches to the distinct `start:api` or `start:worker` script from
the service's non-secret `SERVICE_ROLE`; only `api` receives a public domain
and `/health/ready` deployment check.

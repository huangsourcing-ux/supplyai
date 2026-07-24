# ChinaSupply.AI

ChinaSupply.AI is a pnpm and Turborepo monorepo. Product behavior and implementation scope are governed by the frozen PRD, technology-stack document, development plan, and `AGENTS.md` in this repository.

## Workspace

- `apps/web`: Next.js, Payload, Tailwind, next-intl, and Clerk Web application
- `apps/mobile`: Expo React Native application, scheduled for M0-T5
- `apps/api`: NestJS + Fastify API and BullMQ worker with separate runtime entrypoints
- `packages/config`: shared ESLint, TypeScript, and Tailwind configuration
- `packages/schemas`: shared Zod contracts
- `packages/api-client`: generated API client; generated files must not be edited manually
- `packages/geo`: coordinate and navigation utilities
- `packages/i18n`: shared localization resources
- `packages/analytics`: consent-aware analytics facade

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm build
```

Run the Web foundation locally after the infrastructure and CMS migration are ready:

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm infra:up
pnpm release:migrate:cms
pnpm --filter @chinasupply/web dev
```

Payload schema changes remain explicit release migrations; Web build and startup never mutate the database.

Run the API and worker locally in separate terminals after building them:

```bash
cp apps/api/.env.example apps/api/.env.local
pnpm infra:up
pnpm release:migrate:core
pnpm --filter @chinasupply/api build
pnpm --filter @chinasupply/api start:api
pnpm --filter @chinasupply/api start:worker
```

With the worker running, verify the queue from a third terminal:

```bash
pnpm --filter @chinasupply/api system:ping
```

The operational probes are `GET /health/live` (process-only) and
`GET /health/ready` (PostgreSQL + Redis). Future business routes live below
`/api/v1` and follow the frozen API envelope.

## Local infrastructure

```bash
cp .env.example .env
pnpm infra:up
pnpm infra:check
pnpm infra:down
```

The Compose stack exposes PostGIS and Redis on loopback only and preserves data when stopped. See `docs/operations/environments.md` for the three-environment contract, `docs/operations/migrations.md` for release-command boundaries, and `docs/operations/ci-cd.md` for CI/CD trigger and deployment gates.

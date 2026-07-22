# Migration release commands

Core and CMS schemas have separate owners and separate release commands:

| Target | Schema owner   | Release command             | Application command                          |
| ------ | -------------- | --------------------------- | -------------------------------------------- |
| `core` | Drizzle/NestJS | `pnpm release:migrate:core` | `pnpm --filter @chinasupply/api db:migrate`  |
| `cms`  | Payload        | `pnpm release:migrate:cms`  | `pnpm --filter @chinasupply/web cms:migrate` |

M0-T3 implements the Payload command and commits the initial CMS migration. The core command remains a contract-only placeholder until M0-T4. Inspect either target without executing it:

```bash
pnpm release:migrate:core -- --dry-run
pnpm release:migrate:cms -- --dry-run
```

Real CMS execution requires `APP_ENV`, `DATABASE_URL`, `PAYLOAD_SECRET`, and `NEXT_PUBLIC_SITE_URL`. For local runs, the release runner loads `apps/web/.env.local` when it exists; existing process variables retain precedence. The runner propagates any migration failure and never starts an application, runs a seed, or falls back to the other schema owner.

```bash
pnpm release:migrate:cms
pnpm --filter @chinasupply/web cms:migrate:status
pnpm --filter @chinasupply/web cms:migrate:create migration_name
```

The initial migration owns only `cms_users` and Payload internal tables. It must never create, alter, or drop Drizzle-owned core tables. `push: false` is fixed in Payload configuration, and neither build nor application startup runs migrations.

`.github/workflows/release-migrations.yml` is a reusable `workflow_call` workflow only. A deployment workflow must select one target, attach the matching GitHub Environment, and depend on a successful migration job before deploying that application. The CMS target obtains `DATABASE_URL` and `PAYLOAD_SECRET` from GitHub Environment secrets and `NEXT_PUBLIC_SITE_URL` from an Environment variable. It has no push, tag, manual, production, seed, or deploy trigger.

# Migration release commands

Core and CMS schemas have separate owners and separate release commands:

| Target | Schema owner   | Release command             | Application command supplied later           |
| ------ | -------------- | --------------------------- | -------------------------------------------- |
| `core` | Drizzle/NestJS | `pnpm release:migrate:core` | `pnpm --filter @chinasupply/api db:migrate`  |
| `cms`  | Payload        | `pnpm release:migrate:cms`  | `pnpm --filter @chinasupply/web cms:migrate` |

M0-T2 establishes the contract before the applications and migrations exist. Confirm it without executing a migration:

```bash
pnpm release:migrate:core -- --dry-run
pnpm release:migrate:cms -- --dry-run
```

Real execution requires `APP_ENV` and `DATABASE_URL`. The runner propagates any migration failure and never starts an application, runs a seed, or falls back to the other schema owner.

`.github/workflows/release-migrations.yml` is a reusable `workflow_call` workflow only. A future deployment workflow must select one target, attach the matching GitHub Environment, and depend on a successful migration job before deploying that application. It has no push, tag, manual, production, seed, or deploy trigger in M0-T2.

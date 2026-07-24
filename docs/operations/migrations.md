# Migration release commands

Core and CMS schemas have separate owners and separate release commands:

| Target | Schema owner   | Release command             | Application command                          |
| ------ | -------------- | --------------------------- | -------------------------------------------- |
| `core` | Drizzle/NestJS | `pnpm release:migrate:core` | `pnpm --filter @chinasupply/api db:migrate`  |
| `cms`  | Payload        | `pnpm release:migrate:cms`  | `pnpm --filter @chinasupply/web cms:migrate` |

M0-T3 implements the Payload command and commits the initial CMS migration.
M1-T1 implements the Drizzle schema and the real core `db:migrate` command.
Inspect either target without executing it:

```bash
pnpm release:migrate:core -- --dry-run
pnpm release:migrate:cms -- --dry-run
```

Core execution requires `APP_ENV` and `DATABASE_URL`; CMS additionally
requires `PAYLOAD_SECRET` and `NEXT_PUBLIC_SITE_URL`. For local CMS runs, the
release runner loads `apps/web/.env.local` when it exists; the API command
loads `apps/api/.env.local`. Existing process variables retain precedence. The
runner propagates any migration failure and never starts an application, runs
a seed, or falls back to the other schema owner.

```bash
pnpm release:migrate:cms
pnpm release:migrate:core
pnpm --filter @chinasupply/api db:check
pnpm --filter @chinasupply/api db:generate --name=change_name
pnpm --filter @chinasupply/web cms:migrate:status
pnpm --filter @chinasupply/web cms:migrate:create migration_name
```

The CMS migration owns only `cms_users` and Payload internal tables. The core
migration owns only the nine PRD core/association tables and uses the separate
`drizzle.__drizzle_migrations` journal. Neither owner may create, alter, or drop
the other's tables. `push: false` is fixed in Payload configuration, and
neither build nor application startup runs migrations.

`.github/workflows/release-migrations.yml` is a reusable `workflow_call` workflow only. A deployment workflow must select one target, attach the matching GitHub Environment, and depend on a successful migration job before deploying that application. The CMS target obtains `DATABASE_URL` and `PAYLOAD_SECRET` from GitHub Environment secrets and `NEXT_PUBLIC_SITE_URL` from an Environment variable. It has no push, tag, manual, production, seed, or deploy trigger.

On `main`, M0-T6/M1-T1 call the reusable workflow serially as
`target=cms` followed by `target=core`. `Staging Release Gate` is successful
only when CI and both migrations succeed. Vercel and Railway remain behind the
same gate, so neither application can release a commit whose matching schema
migration failed.

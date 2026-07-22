# ChinaSupply.AI Web

Next.js and Payload skeleton for the public Web application, Payload content
admin, and the Clerk-protected `/ops` foundation.

## Local setup

From the repository root:

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm infra:up
pnpm release:migrate:cms
pnpm --filter @chinasupply/web dev
```

The local routes are:

- `http://localhost:3000/` — public Web skeleton.
- `http://localhost:3000/admin` — Payload Admin using the independent
  `cms_users` auth collection.
- `http://localhost:3000/ops/sign-in` — Clerk sign-in for operations users.
- `http://localhost:3000/ops` — requires the Clerk session claim
  `metadata.role = "admin"`.

Payload and Clerk accounts are intentionally separate. The application never
runs Payload migrations during build or startup.

## Authentication boundaries

- `/admin` authenticates only against Payload's `cms_users` collection. Create
  the first CMS administrator through Payload's first-user screen.
- `/ops/**` authenticates with Clerk and requires the exact session claim
  `metadata.role = "admin"`. Proxy enforcement is repeated in the protected
  Server Component.
- There is no public Clerk registration or ordinary user sign-in in M0-T3.

For staging, configure the Clerk session token claim as
`{"metadata":"{{user.public_metadata}}"}` and administrator Public Metadata as
`{"role":"admin"}`. Restricted mode, allowed origins, redirect URLs, and the
Vercel/Railway environment are deployment settings documented in
`docs/operations/environments.md`.

## CMS schema changes

Create and review a migration explicitly:

```bash
pnpm --filter @chinasupply/web cms:migrate:create migration_name
pnpm release:migrate:cms
pnpm --filter @chinasupply/web cms:migrate:status
```

The M0-T3 Payload configuration contains only `cms-users`. Articles, media,
R2 storage, and business tables remain out of scope. CMS email delivery also
fails closed until a later task explicitly configures a provider, so Payload
never writes password-reset messages or tokens to application logs.

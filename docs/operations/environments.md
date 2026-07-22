# Environment contract

ChinaSupply.AI uses three isolated environments. Values must never fall back from one environment to another.

| Environment | Database and Redis             | Clerk                              | R2                                    | Public URLs              |
| ----------- | ------------------------------ | ---------------------------------- | ------------------------------------- | ------------------------ |
| Local       | Docker Compose on loopback     | Development keys                   | `dev` prefix                          | `localhost`              |
| Staging     | Railway staging resources      | Development instance and test keys | `staging` prefix                      | HTTPS `staging.*`        |
| Production  | Dedicated production resources | Production instance and live keys  | Dedicated bucket with an empty prefix | HTTPS production domains |

## Local setup

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
pnpm infra:up
pnpm infra:check
```

`pnpm infra:down` stops containers while preserving the named volumes. M0-T2 intentionally provides no command that deletes volumes.

The locked `postgis/postgis:17-3.5` image currently publishes an amd64 manifest. `compose.yaml` therefore declares `linux/amd64`; Docker Desktop uses its built-in emulation on Apple Silicon, while Linux CI runs the same image natively.

## Validation ownership

- `@chinasupply/config/env/api` validates server-only API and Worker configuration.
- `@chinasupply/config/env/web` validates Payload/Next.js server values and explicitly public Web values.
- `@chinasupply/config/env/mobile` accepts only the documented `EXPO_PUBLIC_*` application values and rejects known server secrets.

The Web bootstrap calls `parseWebEnv` from `next.config.ts`, so `next dev`, `next build`, and `next start` fail before startup when the Web contract is invalid. M0-T4 and M0-T5 must add the equivalent API and Mobile bootstrap calls. Validation failures report field names only; values must never be logged.

Real secrets live in the deployment platform or GitHub Environment. `.env.example` files contain local defaults and explicit placeholders only. No `.env`, `.env.local`, staging credential, or production credential may be committed.

## Web staging contract

M0-T3 uses one staging-only Vercel project with these settings:

- Project: `chinasupply-web-staging`
- Root Directory: `apps/web`
- Production Branch: `main`
- Application environment: `APP_ENV=staging` and `NEXT_PUBLIC_APP_ENV=staging`
- Domain: `https://staging.chinasupply.ai`
- Source repository: `huangsourcing-ux/supplyai`; automatic Git-triggered deployments remain disabled until M0-T6, so the M0-T3 acceptance deployment is a controlled CLI deployment.

All fields from `apps/web/.env.example` must have real staging values before deployment. The database is the Railway staging PostgreSQL database, Clerk uses a Development instance, and R2 uses the `staging` prefix. The production Web project is intentionally deferred to M5-T9.

The Clerk Development instance must be put in Restricted mode with public sign-up disabled. Configure the session token claim as `{"metadata":"{{user.public_metadata}}"}`, give invited administrators `{"role":"admin"}` in Public Metadata, and allow only the staging origin and redirect URL. `/admin` does not use Clerk; it has an independent Payload `cms_users` account.

Do not mark M0-T3 complete until the CMS release migration has run against Railway staging, the Vercel deployment is healthy over HTTPS, and anonymous, non-admin, and admin `/ops` access have all been smoke-tested.

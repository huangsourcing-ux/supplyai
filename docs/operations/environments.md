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

The Web bootstrap calls `parseWebEnv` from `next.config.ts`, so `next dev`, `next build`, and `next start` fail before startup when the Web contract is invalid. The API and Worker call `parseApiRuntimeEnv` before their Nest modules finish booting; it validates the M0 runtime dependencies while later provider modules retain their own complete configuration contract. Mobile evaluates `parseMobileEnv` from its Expo config before bundling and only exposes `EXPO_PUBLIC_*` values. Validation failures report field names only; values must never be logged.

Real secrets live in the deployment platform or GitHub Environment. `.env.example` files contain local defaults and explicit placeholders only. No `.env`, `.env.local`, staging credential, or production credential may be committed.

## Web staging contract

M0-T3 uses one staging-only Vercel project with these settings:

- Project: `chinasupply-web-staging`
- Root Directory: `apps/web`
- Production Branch: `main`
- Application environment: `APP_ENV=staging` and `NEXT_PUBLIC_APP_ENV=staging`
- Domain: `https://staging.chinasupply.ai`
- Source repository: `huangsourcing-ux/supplyai`; pull requests may build as Vercel Preview deployments for validation. M0-T6 owns automatic `main` delivery and requires the GitHub `Staging Release Gate` deployment check before the staging domain is moved to a new deployment.

Because this is a staging-only Vercel project, both Vercel `Production` (the controlled staging deployment from `main`) and `Preview` (pull-request validation) scopes must contain the same real staging values. Vercel target names do not change `APP_ENV`: it remains `staging` in both scopes. Secrets must be copied through Vercel's encrypted environment-variable store and never through repository files or build logs.

All fields from `apps/web/.env.example` must have real staging values before deployment. The database is the Railway staging PostgreSQL database, Clerk uses a Development instance, and R2 uses the `staging` prefix. The production Web project is intentionally deferred to M5-T9.

M0-T7 additionally requires the Web Sentry DSN, organization/project slugs, and
build-only auth token in both Vercel scopes. Vercel's commit SHA is embedded in
the Sentry release and the build uploads source maps as described in
`docs/operations/sentry.md`.

The Clerk Development instance must be put in Restricted mode with public sign-up disabled. Configure the session token claim as `{"metadata":"{{user.public_metadata}}"}`, give invited administrators `{"role":"admin"}` in Public Metadata, and allow only the staging origin and redirect URL. `/admin` does not use Clerk; it has an independent Payload `cms_users` account.

Do not mark M0-T3 complete until the CMS release migration has run against Railway staging, the Vercel deployment is healthy over HTTPS, and anonymous, non-admin, and admin `/ops` access have all been smoke-tested.

## Mobile Preview contract

The Expo project is `@huangsourcing/chinasupply-ai`. Its `preview` profile is
an internal Android APK build using the EAS `preview` environment and Node
`22.23.1`. The M0-T5c staging compatibility artifact is limited to arm64-v8a to
keep the MapLibre cloud build bounded; this is not the production ABI policy.
Commands are launched from `apps/mobile` through the root
`mobile:eas:preview` wrapper. Expo SDK 54 discovers the pnpm monorepo
automatically; do not add an unsupported EAS `workingDirectory` field, switch
pnpm to a hoisted linker, or hand-maintain Metro `watchFolders`.

The EAS Preview environment must contain:

- `EXPO_PUBLIC_APP_ENV=staging`
- the real HTTPS staging `EXPO_PUBLIC_API_BASE_URL`
- a Clerk Development `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- the Mobile Sentry DSN, organization and project identifiers, plus the
  build-only Sentry auth token described in `docs/operations/sentry.md`

MapTiler and PostHog public values remain optional until their owning tasks
connect those integrations. If supplied, they are still validated as real
values: placeholders are rejected, production MapTiler keys cannot enter
staging, and PostHog key/host must be provided together. Sentry is required by
M0-T7 for every non-local Mobile build.

The retained Development smoke user password is stored only in macOS Keychain
under service `ai.chinasupply.clerk.mobile-smoke`. Neither the password nor
Clerk session tokens belong in source, EAS variables, logs, fixtures, or task
transcripts. Clerk tokens in the app use encrypted MMKV with the encryption key
held by the device SecureStore. If a smoke credential is displayed by test
automation, rotate it immediately in Clerk and overwrite the same Keychain
item; do not preserve the exposed value in screenshots or build evidence.

## API and Worker staging contract

M0-T4 uses the staging-only Railway project `chinasupply-staging`. Railway's
default internal environment label remains `production`, but both application
services explicitly run with `APP_ENV=staging`; this project and its resources
must not be treated as the real production environment.

- `api`, `worker`, PostGIS, and Redis run as separate SFO services.
- `DATABASE_URL` and `REDIS_URL` are Railway reference variables; values are not
  copied into source or logs.
- The API and Worker share the root Railpack build, while `SERVICE_ROLE` selects
  `start:api` or `start:worker` at runtime.
- API deployment health is gated by `/health/ready`. Its temporary validation
  domain is `https://api-production-05a7.up.railway.app`; M0-T10 owns the final
  Cloudflare-proxied staging API hostname.
- Worker has no public domain. Queue acceptance is performed by running
  `system:ping` inside the deployed API container and confirming completion in
  the separate Worker logs.
- Both services require the matching `SENTRY_DSN`; Railway's commit SHA forms
  their shared Sentry release.

M0-T6 connects both application services to `huangsourcing-ux/supplyai:main`
with Railway Wait for CI enabled. Railway must skip a deployment whenever the
GitHub CI or staging migration gate fails. Production resources remain M5-T9.

See `docs/operations/ci-cd.md` for trigger boundaries, secret ownership,
deployment ordering, and rollback checks.
See `docs/operations/sentry.md` for the three-platform Sentry variables,
release names, source map upload path, and external acceptance checklist.

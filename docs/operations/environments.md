# Environment contract

ChinaSupply.AI uses three isolated environments. Values must never fall back from one environment to another.

| Environment | Database and Redis             | Clerk                              | R2                                                                                                 | Public URLs              |
| ----------- | ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| Local       | Docker Compose on loopback     | Development keys                   | Separate media/private buckets with `dev` prefix                                                   | `localhost`              |
| Staging     | Railway staging resources      | Development instance and test keys | `chinasupply-staging-media` (public) + `chinasupply-staging` (private), both with `staging` prefix | HTTPS `staging.*`        |
| Production  | Dedicated production resources | Production instance and live keys  | Two dedicated buckets with empty prefixes (created in M5-T9)                                       | HTTPS production domains |

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

The Web bootstrap calls `parseWebEnv` from `next.config.ts`, so `next dev`, `next build`, and `next start` fail before startup when the Web contract is invalid. The API HTTP entrypoint calls `parseApiHttpEnv`, which additionally requires `EDGE_PROXY_SECRET` outside local development; the Worker calls `parseApiRuntimeEnv` and does not receive that edge-only secret. Later provider modules retain their own complete configuration contract. Mobile evaluates `parseMobileEnv` from its Expo config before bundling and only exposes `EXPO_PUBLIC_*` values. Validation failures report field names only; values must never be logged.

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

All fields from `apps/web/.env.example` must have real staging values before deployment. The database is the Railway staging PostgreSQL database, Clerk uses a Development instance, and the Web/Payload R2 credentials are limited to Object Read/Write on `chinasupply-staging-media`; `R2_MEDIA_BUCKET`, `R2_PREFIX=staging`, and `R2_CDN_BASE_URL=https://cdn-staging.chinasupply.ai` identify that media boundary. The production Web project is intentionally deferred to M5-T9.

M0-T7 additionally requires the Web Sentry DSN, organization/project slugs, and
build-only auth token in both Vercel scopes. Vercel's commit SHA is embedded in
the Sentry release and the build uploads source maps as described in
`docs/operations/sentry.md`.

M0-T3 initially put the Clerk Development instance in Restricted mode with
public sign-up disabled. M3-T1 changed the staging Development instance to the
following state on 2026-07-26:

- public self-service sign-up is allowed and Restricted mode is disabled;
- email verification codes are enabled for sign-up and sign-in, without
  email passwords or email links;
- Google is enabled for sign-up and sign-in with Clerk's shared Development
  credentials; no custom OAuth credentials are stored in the repository;
- the session token claim remains
  `{"metadata":"{{user.public_metadata}}"}`, and administrator Public Metadata
  remains `{"role":"admin"}`;
- allow only the approved localhost/staging origins and Clerk redirect URLs;
  do not commit OAuth credentials, Clerk keys, session tokens, or smoke-user
  credentials.

The public `/sign-in` route and `/ops/sign-in` share this Clerk instance.
`/ops/**` still requires the exact admin role in both the proxy and protected
Server Component, while `/admin` continues to use the independent Payload
`cms_users` account. Users created during M3-T1 are not synchronized into the
core `users` table until M3-T2/M3-T3.

M3-T1 staging acceptance normally covers an existing and new email-code user,
a new Google user, return from a cluster Save action to the same canonical
cluster URL, direct `/sign-in` fallback to `/`, and anonymous/non-admin/admin
`/ops` behavior. On 2026-07-26 the email-code, return/fallback, existing Google
OAuth, and all three `/ops` states passed against the staging configuration;
the canonical staging `/sign-in` route was also confirmed after the merge.
Because no second unused Google identity was available, the Owner explicitly
accepted the task and waived that single new-Google-user smoke. This waiver is
not evidence that the omitted scenario passed and must not be reused as such.

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
- separate `EXPO_PUBLIC_MAPTILER_IOS_KEY` and
  `EXPO_PUBLIC_MAPTILER_ANDROID_KEY` values
- the Mobile Sentry DSN, organization and project identifiers, plus the
  build-only Sentry auth token described in `docs/operations/sentry.md`

Both MapTiler platform keys are required outside local development and may not
be reused across platforms. MapLibre adds the matching restricted User-Agent
only to `https://api.maptiler.com/` requests. PostHog remains optional until its
owning task; key/host must be provided together. Sentry is required by M0-T7
for every non-local Mobile build.

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
- The API and Worker share the root Railpack build. Its filtered Turbo command
  builds API workspace dependencies first, including the JavaScript
  `@chinasupply/schemas` runtime package; `SERVICE_ROLE` then selects
  `start:api` or `start:worker`.
- API deployment health is gated by `/health/ready`. Its Railway origin remains
  `https://api-production-05a7.up.railway.app`; the public hostname is
  `https://api-staging.chinasupply.ai`.
- `/health/live` and `/health/ready` stay available to direct Railway probes.
  Every other remote request must carry the Cloudflare-only edge secret.
  `/health/edge` is a no-store diagnostic that returns the validated single
  `CF-Connecting-IP`; direct origin access returns the standard 403 envelope.
- API/Worker R2 credentials are limited to Object Read/Write on the staging
  media and private buckets. `CLOUDFLARE_PURGE_TOKEN` is a separate Railway
  secret limited to Cache Purge on the `chinasupply.ai` zone; M0-T10 verifies
  it but does not perform a purge. Starting with M1-T6, the remote API validates
  both `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_PURGE_TOKEN` at startup so the
  internal prefix-purge client is ready for M5-T3.
- Search and each MAP route have independent 60 requests/minute budgets keyed
  by the trusted `CF-Connecting-IP` and stored in Redis. MAP success responses
  are edge-cacheable for one hour; search is not cached and all API errors are
  `no-store`.
- Worker has no public domain. Queue acceptance is performed by running
  `system:ping` inside the deployed API container and confirming completion in
  the separate Worker logs.
- Both services require the matching `SENTRY_DSN`; Railway's commit SHA forms
  their shared Sentry release.

M3-T2 adds the Clerk lifecycle endpoint at
`https://api-staging.chinasupply.ai/api/v1/webhooks/clerk`. The Clerk
Development endpoint must subscribe only to `user.created`, `user.updated`, and
`user.deleted`. Its signing secret is stored as `CLERK_WEBHOOK_SECRET` on the
Railway `api` service only; the Worker does not receive or validate it. Requests
must use the public Cloudflare hostname so the existing trusted-edge transform
can reach Railway without exposing the direct origin.

The repository e2e suite verifies real Standard Webhooks signatures, exact raw
body handling, concurrent replay idempotency, user synchronization, deletion
tombstones, favorite removal, and deleted-user 401 responses. This does not
replace the staging gate: before marking M3-T2 complete, configure the encrypted
Railway value, deploy the API, create the Clerk endpoint, and use a disposable
staging user to observe created, updated, and deleted deliveries succeeding.
Do not record the signing secret, request headers, JWT, or disposable-user
credentials in source, logs, screenshots, or review evidence. M3-T3 still owns
the one-time backfill for users created before this endpoint is active.

M0-T6 connects both application services to `huangsourcing-ux/supplyai:main`
with Railway Wait for CI enabled. Railway must skip a deployment whenever the
GitHub CI or staging migration gate fails. Production resources remain M5-T9.

See `docs/operations/ci-cd.md` for trigger boundaries, secret ownership,
deployment ordering, and rollback checks.
See `docs/operations/sentry.md` for the three-platform Sentry variables,
release names, source map upload path, and external acceptance checklist.
See `docs/operations/cloudflare-maptiler.md` for the M0-T10 resource contract,
smoke tests, rotation, and rollback.

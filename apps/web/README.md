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
- `http://localhost:3000/sign-in` — public Clerk email/Google sign-in and
  sign-up flow.
- `http://localhost:3000/admin` — Payload Admin using the independent
  `cms_users` auth collection.
- `http://localhost:3000/guides` — published English sourcing guides.
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
- `/sign-in/**` is the ordinary user flow. Clerk Dashboard controls the enabled
  methods; M3-T1 requires public sign-up, email verification codes, and Google
  sign-up/sign-in. Cluster save actions preserve their canonical detail URL
  through both sign-in and sign-up.
- Ordinary users and operations administrators share the Clerk instance, but
  ordinary authentication never grants the `admin` role. Payload authentication
  remains completely separate.

For staging, configure the Clerk session token claim as
`{"metadata":"{{user.public_metadata}}"}` and administrator Public Metadata as
`{"role":"admin"}`. Public sign-up, allowed origins, redirect URLs, and the
Vercel/Railway environment are deployment settings documented in
`docs/operations/environments.md`.

M3-T1 only establishes the Web authentication and return path. Users created
before the Clerk webhook lands are intentionally absent from the application
`users` table; M3-T2 owns ongoing synchronization and M3-T3 owns the one-time
backfill.

## Analytics consent

Buyer-facing routes show a non-blocking analytics choice on the first visit.
The exact `granted` or `denied` choice is stored under
`chinasupply.analytics-consent.v1`; the public navigation's **Analytics** button
reopens the settings so the choice can be changed. Invalid or unavailable
storage is treated as unknown and analytics remains fail-closed.

The Web app dynamically imports `posthog-js` only after an explicit grant on a
buyer-facing route. Unknown and denied states do not import or initialize the
SDK, and withdrawing consent immediately disconnects the shared capture facade
and opts out the loaded PostHog instance. Automatic capture, page views,
page-leave events, replay, surveys, exceptions, performance, heatmaps, and
feature flags are disabled; only the six events owned by
`@chinasupply/analytics` may be sent. The integration remains anonymous and
does not call Clerk `identify`.

`/ops/**`, `/sign-in/**`, and Payload `/admin/**` do not show the consent UI and
cannot trigger the first PostHog load from a saved grant. Configure
`NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` together through the
matching environment's encrypted deployment settings; never commit their real
values or a PostHog personal access token.

## CMS schema changes

Create and review a migration explicitly:

```bash
pnpm --filter @chinasupply/web cms:migrate:create migration_name
pnpm release:migrate:cms
pnpm --filter @chinasupply/web cms:migrate:status
```

The CMS owner is limited to `cms-users`, `media`, `articles`, article versions,
and Payload internal tables. The M5-T4 media collection uses Payload's direct
S3-compatible client upload adapter against the public R2 media bucket. The
browser first requests a five-minute signed PUT with its Payload session and a
same-origin request; the R2 PUT itself carries no CMS cookie. Only JPEG, PNG,
and WebP files from 1 byte through 10 MB are accepted. The server chooses an
environment-owned `(<prefix>/)articles/media-<21-char-nanoid>.<ext>` key and
HEAD-verifies the object before Media creation and again before Article
publication. Set `R2_ENDPOINT` only for a local S3-compatible service; remote
Cloudflare R2 derives its endpoint from `R2_ACCOUNT_ID`.

Migration-only runs intentionally omit R2 credentials. The adapter is disabled
there while `alwaysInsertFields` keeps the generated schema identical; Web
runtime startup still requires the complete R2 configuration through the
existing Web environment parser. CMS email delivery remains fail-closed, so
Payload never writes password-reset messages or tokens to application logs.

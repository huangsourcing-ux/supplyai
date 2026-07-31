# M5-T9 Web Production Preflight (advanced under M5-T7)

Date: 2026-07-31

Status: partially complete; no commercial Go-Live claim

## Owner authorization and MapTiler classification

The Owner authorized the Web-only M5-T8a/M5-T9 prerequisites to run early so
the current unrelated test content at `www.chinasupply.ai` can be replaced.
The Owner also confirmed the site remains a non-commercial development and
acceptance environment.

Accordingly, the Web preview uses a new MapTiler Free R&D key restricted to
`www.chinasupply.ai` and `chinasupply.ai`. It is not the staging key. The key
value is stored only in the Vercel production environment; the repository
records only its SHA-256 digest:

`070b56a3b9e3bab3ca1d3e3cf609662a9d185518192b879d24f9dd642a1f18bc`

This exception expires before the first commercial use, monetization,
commercial announcement, or store Production Submit. That later event still
requires Flex, commercial terms/billing review, and separate Web/iOS/Android
production keys.

## Resources created or corrected

### Cloudflare

- private operations bucket: `chinasupply-production`;
- public media bucket: `chinasupply-production-media`;
- custom media domain: `media.chinasupply.ai`;
- production media CORS: apex/`www` only, GET/HEAD/PUT, `Content-Type` and
  `Content-Length`, exposed `ETag`, one-hour max age;
- account token `chinasupply-api-worker-production`: Object Read & Write on
  the production private and media buckets only;
- account token `chinasupply-web-production-media`: Object Read & Write on
  the production media bucket only;
- five unproxied Clerk CNAME records were created for the Frontend API,
  Account Portal, email delivery, and both DKIM selectors.

Two identically named buckets were initially created in the wrong Cloudflare
account. Read-only checks proved both were empty (zero objects/zero bytes), so
those exact two empty buckets were deleted. No staging bucket or object was
changed.

Real S3 smoke tests wrote, HEAD-checked, and deleted one temporary object
through the API/Worker token in each production bucket and through the Web
token in the media bucket. All three cleanup calls succeeded. The Web token
was separately denied access to the private bucket with HTTP 403. Token values
were installed directly into their target platforms and were not committed or
written to task logs.

### Clerk

- a separate Production instance was cloned from the approved Development
  authentication/theme configuration;
- its base domain is `chinasupply.ai`;
- no Development users were copied;
- the live publishable and secret keys were written directly to the Vercel
  production environment and never committed;
- the repository records only their SHA-256 digests:
  - publishable:
    `7550f1eed878894c2ae19730adc7c6511170bdeaf43e12dd326223bdea15d0a1`;
  - secret:
    `306a639eac3ac55bc6f39a0e0affd940390c053abe0a636900c23d5136bd24f3`.

DNS resolves all five expected CNAMEs publicly. Clerk now reports the complete
DNS configuration as Verified and its SSL certificates as Issued. Google
Production OAuth, the API webhook, Native Application, and Apple connection
are not complete.

### Railway

- project: `chinasupply-production`;
- PostGIS service image: `postgis/postgis:17-3.5`;
- persistent volume: `postgis-volume`, mounted at
  `/var/lib/postgresql/data`;
- `PGDATA=/var/lib/postgresql/data/pgdata` avoids the mount-root
  `lost+found` initialization failure;
- public TCP proxy exists for Vercel/Payload database access;
- the initially exposed generated database password was rotated before the
  database initialized;
- Core migration and both Payload migrations succeeded;
- post-migration verification: PostgreSQL 17.5, PostGIS 3.5, 21 public user
  tables, Drizzle migrations 1, Payload migrations 2, and zero content rows;
- seven R2 settings are stored as production shared variables:
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_MEDIA_BUCKET`, `R2_PRIVATE_BUCKET`, empty `R2_PREFIX`, and
  `R2_CDN_BASE_URL`. They are not referenced by PostGIS and did not trigger a
  deployment.

The Railway account UI identifies the workspace as a verified Trial and, on
2026-07-31, showed 21 days and USD 3.74 of trial credit remaining. Railway's
current public Trial documentation says a Trial project can contain up to five
services and a Trial project can contain up to three volumes. Despite that
published allowance, the production project rejected both supported creation
paths tested against the real account:

- the managed Redis database path returned `Free plan resource provision limit
exceeded. Please upgrade to provision more resources!`;
- a direct `redis:8.2.1` Docker image service returned `Free plan resource
creation has been exceeded` and opened the Hobby upgrade gate.

Neither attempt created a service, deployment, volume, or billable resource.
The Owner chose to retain the current no-payment Trial state for
non-commercial R&D. The existing production PostGIS service and shared-variable
preflight remain valid, but the account-specific provisioning gate blocks any
new Redis/API/Worker service. This does not satisfy the Redis-backed G-11
throttle or the M5-T9 API/Worker deployment gate. Reusing or deleting the
canonical staging services would break the approved environment-isolation and
CI/CD contract and was not performed.

### Vercel

- existing project `chinasupply` remains the canonical domain owner;
- it was disconnected from the obsolete `huangsourcing-ux/chinasupply`
  repository and connected to `huangsourcing-ux/supplyai`;
- root directory is `apps/web`, framework is Next.js, Node is 24.x;
- apex, `www`, and the previous production deployment remain attached for
  rollback;
- production app/database/Clerk/MapTiler/Sentry/PostHog/site/API/media
  variables are configured, including the media-only production R2 S3
  credential as sensitive Production-only variables;
- the project-specific Ignored Build Step now builds only when
  `VERCEL_ENV=production`; non-production branches continue to use the
  separate canonical staging Vercel project and cannot accidentally start this
  project's production-only configuration.

No new deployment has been promoted to `www` yet. This preserves the old
deployment until the API, content, and preview smoke are ready.

## Remaining Web cutover gates

1. Have Railway lift the account-specific provisioning gate, or explicitly
   authorize a paid plan, then create Railway Redis, API, and Worker services.
   The current no-payment Trial may retain PostGIS for R&D, but the cutover
   cannot proceed with only PostGIS. Do not repurpose or delete canonical
   staging resources as a workaround.
2. Create the Clerk production webhook after the API domain exists and install
   its Svix secret.
3. Run M5-T8a export/import/review/publish.
4. Configure the remaining API/Worker variables, attach the shared R2
   references, release the exact commit, verify readiness,
   backup, logs, rate limits, R2, webhook, and rollback.
5. Deploy a non-aliased Vercel production candidate, run the complete M5-T7
   closure suite, then promote it to apex/`www`.

M5-T9 remains unchecked because Redis/API/Worker, production content review,
webhook, cutover, backup/smoke, Flex commercial gate, and all
Apple/store/Native prerequisites are incomplete.

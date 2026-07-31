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
- production media CORS: apex/`www` only, GET/HEAD/PUT, `Content-Type`,
  exposed `ETag`, one-hour max age;
- five unproxied Clerk CNAME records were created for the Frontend API,
  Account Portal, email delivery, and both DKIM selectors.

Two identically named buckets were initially created in the wrong Cloudflare
account. Read-only checks proved both were empty (zero objects/zero bytes), so
those exact two empty buckets were deleted. No staging bucket or object was
changed.

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

DNS currently resolves all five expected CNAMEs publicly. Clerk has verified
the Frontend API record; the Account Portal, mail, DKIM, and certificate
issuance remain pending provider-side verification. Google Production OAuth,
the API webhook, Native Application, and Apple connection are not complete.

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
  tables, Drizzle migrations 1, Payload migrations 2, and zero content rows.

The Railway Trial plan permits only the current service. Redis, API, and
Worker creation now requires Hobby. The checkout explicitly shows a $5
up-front charge with $5 monthly usage credit and requires the Owner to enter
card number, expiry, and CVC. No agent may inspect or enter that payment data.

### Vercel

- existing project `chinasupply` remains the canonical domain owner;
- it was disconnected from the obsolete `huangsourcing-ux/chinasupply`
  repository and connected to `huangsourcing-ux/supplyai`;
- root directory is `apps/web`, framework is Next.js, Node is 24.x;
- apex, `www`, and the previous production deployment remain attached for
  rollback;
- production app/database/Clerk/MapTiler/Sentry/PostHog/site/API/media
  variables were configured, except the pending production R2 S3
  credentials.

No new deployment has been promoted to `www` yet. This preserves the old
deployment until the API, content, and preview smoke are ready.

## Remaining Web cutover gates

1. The Owner upgrades Railway Hobby in the retained checkout page; then create
   Redis, API, and Worker services.
2. An authorized Cloudflare account member creates one object-read/write R2
   API token scoped only to the two production buckets; install it in
   Railway/Vercel and run an S3 smoke.
3. Finish Clerk DNS/certificate verification, create the production webhook
   after the API domain exists, and install its Svix secret.
4. Run M5-T8a export/import/review/publish.
5. Configure API/Worker variables, release exact commit, verify readiness,
   backup, logs, rate limits, R2, webhook, and rollback.
6. Deploy a non-aliased Vercel production candidate, run the complete M5-T7
   closure suite, then promote it to apex/`www`.

M5-T9 remains unchecked because Redis/API/Worker, production content review,
webhook, cutover, backup/smoke, Flex commercial gate, and all
Apple/store/Native prerequisites are incomplete.

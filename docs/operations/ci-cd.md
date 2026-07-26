# CI/CD contract

M0-T6 uses GitHub Actions for repository checks and staging release gates,
native Git deployments for Vercel and Railway, and EAS Workflows for native
artifacts. EAS Build is never called by the GitHub PR or `main` workflow.

## Trigger matrix

| Trigger                       | Required work                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Pull request to `main`        | lint, typecheck, all unit tests, Web/API/Worker build, API Testcontainers e2e, deterministic Chromium Web Playwright            |
| Mobile-affecting pull request | all PR checks plus Expo Doctor, public Expo config validation, and Mobile unit tests                                            |
| Push to `main`                | all applicable checks, serial CMS → core staging migrations, `Staging Release Gate`, then native Vercel/Railway staging release |
| `rc-*` tag                    | Android EAS Preview Build                                                                                                       |
| EAS workflow dispatch         | Android EAS Preview Build                                                                                                       |
| `v*` tag                      | EAS approval, iOS/Android Production Build, then per-platform Submit                                                            |

Mobile-affecting paths are `apps/mobile`, the mobile-consumed `config`, `geo`,
`i18n`, and `schemas` packages, and root workspace/package-manager manifests.
GitHub reports one stable `CI Gate` after all applicable jobs. Pull requests use
no deployment secret and the workflow never uses `pull_request_target`.

## Web Playwright split

Pull requests run `pnpm test:web:e2e` in the independent `Web Playwright` job.
The suite enables Next test proxy only for that process, reuses the generated
Orval MSW handler factories, and serves fixed TileJSON, glyph, logo, and empty
vector-tile fixtures. Unexpected external requests fail the test. Chromium,
the HTML report, traces, screenshots, videos, and test results are isolated
from the normal Web build; failure artifacts are retained by GitHub Actions.

The real staging smoke is intentionally outside PR CI. Run it explicitly after
the staging alias contains the candidate behavior:

```bash
PLAYWRIGHT_STAGING_BASE_URL=https://staging.chinasupply.ai \
  pnpm test:web:e2e:staging
```

That command starts no local server and mounts no MSW handlers. It must observe
successful real MAP-1, MapTiler TileJSON, and vector-tile responses before
checking the Canvas, mandatory attribution, and the published Dongguan search
to card path. `PLAYWRIGHT_STAGING_BASE_URL` must be an HTTPS URL whose hostname
is exactly `staging.chinasupply.ai`; omitting it uses that same default.

## Staging release ordering

```text
CI Gate
  -> reusable release-migrations.yml (target=cms, environment=staging)
  -> reusable release-migrations.yml (target=core, environment=staging)
  -> Staging Release Gate
  -> Vercel staging alias / Railway API and Worker release
```

The GitHub `staging` Environment owns:

- secrets: `DATABASE_URL`, `PAYLOAD_SECRET`
- variable: `NEXT_PUBLIC_SITE_URL`

Vercel and Railway runtime values remain in their platform stores. No Vercel
token or Railway token is stored in GitHub because both platforms use their
native Git integration. The repository is currently public, so GitHub Free
supports the required Environment secrets and branch protection. If the
repository becomes private again, GitHub Pro (or a higher plan) is required to
retain those controls. Do not fall back to repository-level deployment secrets.

M1-T1 extends the M0 gate with the real Drizzle `db:migrate` command. CMS and
core migrations run serially against the shared database; the final gate
checks both results before Railway API/Worker or Vercel can release.

## Platform settings

External status on 2026-07-23:

- GitHub `staging` Environment, `CI Gate` branch protection, CMS migration, and
  `Staging Release Gate` passed the M0 acceptance run on `main`. The first
  M1-T1 merge must additionally record the core migration result.
- Vercel is connected to `main`; required Deployment Check
  `Staging Release Gate` blocks production alias assignment and has passed on a
  real `main` deployment.
- Railway API and Worker are connected to `main`, use `/railway.json`, and
  have Autodeploy + Wait for CI enabled. Both services remained `WAITING` until
  the GitHub check suite passed, then successfully released the verified
  commit.
- Railway runs the filtered Turbo API build, so `^build` compiles runtime
  workspace dependencies such as `@chinasupply/schemas` to JavaScript before
  `node dist/main.js` starts. CI launches that compiled entrypoint and probes
  `/health/live` to prevent source-only workspace exports from reaching
  staging.

### Vercel staging

- Project: `chinasupply-web-staging`
- Root: `apps/web`
- Production branch: `main`
- Git deployment: enabled
- Required Deployment Check: `Staging Release Gate`
- Automatic production aliasing: enabled only behind the required check

Vercel may prepare the build while CI runs, but `staging.chinasupply.ai` must
not move until the release gate succeeds. Pull-request Preview deployments
remain allowed and use the staging project Preview environment values.

### Railway staging

- Project: `chinasupply-staging`
- Services: `api`, `worker`
- Source: `huangsourcing-ux/supplyai`, branch `main`
- Autodeploy: enabled
- Wait for CI: enabled on both services
- Config file: `/railway.json`

Both services use the same watch paths. `SERVICE_ROLE` continues to select the
HTTP or Worker start command. The API retains `/health/ready` as its deployment
health check; the Worker has no public domain.

The 2026-07-23 acceptance run used commit
`5a5f7fad9ae07ecb7e376eb458f7c5d002bf1f8f`. GitHub Actions run
`29989416236` completed CMS migration before `Staging Release Gate`; Vercel
check run `ckr_3fe47e76-31b3-48ab-a14f-74b77d83c605` then released the staging
aliases. Railway deployment `33485e90-8d1d-4eac-82c9-85d98e145d84` (API) and
`a6e4fcd5-fc66-43d9-bbbf-3a10a170ee0a` (Worker) both moved from `WAITING` to
`SUCCESS` for that SHA.

### EAS

Preview uses the EAS `preview` environment and the existing Android internal
APK profile. Production uses the `production` environment and store
distribution. The Production workflow approval occurs before either cloud
build consumes quota. Submit jobs depend only on the successful build for their
own platform.

## Branch governance

Protect `main` with these settings:

- require a pull request before merging, with zero mandatory approving reviews
  for the current single-maintainer repository;
- require the `CI Gate` status check;
- apply restrictions to administrators;
- block force pushes and branch deletion.

This prevents direct pushes while keeping a single maintainer able to merge a
green PR.

## Verification and rollback

For a normal PR, confirm `CI Gate` passes and no EAS workflow starts. For a
Mobile PR, also confirm `Mobile PR checks` runs. After merging `main`, record
the commit SHA and confirm CMS migration is followed by core migration before
either platform release. Confirm Vercel serves the same SHA, Railway API and
Worker deploy the same SHA, `/health/live` and `/health/ready` return 200, and
`system:ping` completes.

Do not create a `v*` tag for M0-T6 verification. Validate EAS YAML with
`eas workflow:validate`; real store submission remains M5-T10.

If an application release fails, keep the previous deployment active. Vercel
can reassign the staging alias to the prior deployment; Railway can redeploy
the previous successful API/Worker deployment. Migration failures stop the
release gate and are never bypassed automatically. Schema rollback is a
separate reviewed migration, not an application rollback side effect.

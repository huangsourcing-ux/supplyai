# CI/CD contract

M0-T6 uses GitHub Actions for repository checks and staging release gates,
native Git deployments for Vercel and Railway, and EAS Workflows for native
artifacts. EAS Build is never called by the GitHub PR or `main` workflow.

## Trigger matrix

| Trigger                       | Required work                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Pull request to `main`        | lint, typecheck, all unit tests, Web build, API/Worker build, API Testcontainers e2e                             |
| Mobile-affecting pull request | all PR checks plus Expo Doctor, public Expo config validation, and Mobile unit tests                             |
| Push to `main`                | all applicable checks, CMS staging migration, `Staging Release Gate`, then native Vercel/Railway staging release |
| `rc-*` tag                    | Android EAS Preview Build                                                                                        |
| EAS workflow dispatch         | Android EAS Preview Build                                                                                        |
| `v*` tag                      | EAS approval, iOS/Android Production Build, then per-platform Submit                                             |

Mobile-affecting paths are `apps/mobile`, the mobile-consumed `config`, `geo`,
`i18n`, and `schemas` packages, and root workspace/package-manager manifests.
GitHub reports one stable `CI Gate` after all applicable jobs. Pull requests use
no deployment secret and the workflow never uses `pull_request_target`.

## Staging release ordering

```text
CI Gate
  -> reusable release-migrations.yml (target=cms, environment=staging)
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

The current M0 migration gate runs only Payload CMS migrations. M1-T1 owns the
real Drizzle `db:migrate` command and must add a `core` migration gate before
Railway API/Worker release. A no-op core command is not acceptable.

## Platform settings

External status on 2026-07-23:

- GitHub `staging` Environment, `CI Gate` branch protection, CMS migration, and
  `Staging Release Gate` are active and have passed on `main`.
- Vercel is connected to `main` and serves the verified commit, but the
  `Staging Release Gate` still needs to be selected as a required Deployment
  Check in the Vercel project settings.
- Railway API and Worker are connected to `main`, use `/railway.json`, and
  successfully run the verified commit. Railway Autodeploy + Wait for CI cannot
  be enabled until a project member connects a contributor GitHub account and
  grants the Railway GitHub App access to `huangsourcing-ux/supplyai`.

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
the commit SHA and confirm CMS migration success precedes both platform
releases, Vercel serves the same SHA, Railway API and Worker deploy the same
SHA, `/health/live` and `/health/ready` return 200, and `system:ping` completes.

Do not create a `v*` tag for M0-T6 verification. Validate EAS YAML with
`eas workflow:validate`; real store submission remains M5-T10.

If an application release fails, keep the previous deployment active. Vercel
can reassign the staging alias to the prior deployment; Railway can redeploy
the previous successful API/Worker deployment. Migration failures stop the
release gate and are never bypassed automatically. Schema rollback is a
separate reviewed migration, not an application rollback side effect.

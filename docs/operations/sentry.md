# Sentry three-platform contract

M0-T7 connects Sentry to the Web browser and Next.js server runtimes, the
NestJS API and Worker, and the Expo native application. The application keeps
the frozen `local` / `staging` / `production` environment names; Sentry receives
the shorter names below:

| Application environment | Sentry environment |
| ----------------------- | ------------------ |
| `local`                 | `dev`              |
| `staging`               | `staging`          |
| `production`            | `prod`             |

The Sentry organization is `huangsourcing`. M0-T7 created and verified these
projects:

| Runtime | Sentry project |
| ------- | -------------- |
| Web browser / Next.js server / edge | `chinasupply-web` |
| NestJS API / BullMQ Worker | `chinasupply-api` |
| Expo native application | `chinasupply-mobile` |

The release-upload token has only `org:ci`; project administration used a
separate short-lived internal integration. DSNs remain in deployment-platform
configuration and must never be copied into this document.

## Release names

- Web uses `chinasupply-web@0.0.0+<commit>`. Vercel provides the commit through
  `VERCEL_GIT_COMMIT_SHA`; CI can use `GITHUB_SHA`.
- API and Worker use `chinasupply-api@0.0.0+<commit>`. Railway provides the
  commit through `RAILWAY_GIT_COMMIT_SHA`. Both processes intentionally share a
  release because they ship from the same artifact.
- Mobile leaves native release and distribution generation to the Sentry React
  Native build integration. The expected release is the environment-specific
  native application identifier plus Expo `version=0.0.1` and native
  `buildNumber` / `versionCode=1`. The exact value shown by the uploaded EAS
  artifact must be copied into the acceptance evidence; do not hard-code it in
  JavaScript.

Explicit `SENTRY_RELEASE` is supported for an API smoke run. Web derives and
embeds `NEXT_PUBLIC_SENTRY_RELEASE` during the build so browser events and
uploaded artifacts cannot drift apart.

## Deployment variables

All DSNs are public ingestion identifiers. Auth tokens remain server/build
secrets and must not be exposed through `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, Expo
`extra`, logs, or fixtures.

### Vercel Web staging project

Set these values in both Production and Preview scopes of the staging-only
Vercel project:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- secret `SENTRY_AUTH_TOKEN` beginning with `sntrys_`

`APP_ENV` and `NEXT_PUBLIC_APP_ENV` remain `staging`. `next build` uploads Web
source maps only when the token, organization, and project are all present.
Client source maps are hidden from deployment output after upload.

### Railway API and Worker

Set `SENTRY_DSN` on both services. Railway injects
`RAILWAY_GIT_COMMIT_SHA`, so an explicit release is not required. API and Worker
startup fail validation in staging/production when the DSN or release source is
missing.

### EAS Preview and Production

Set the following in both EAS environments, using the matching project and DSN:

- `EXPO_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- secret `SENTRY_AUTH_TOKEN` beginning with `sntrys_`

Set `EXPO_PUBLIC_SENTRY_SMOKE_ENABLED=true` only for a controlled Preview
acceptance build, then return it to `false`. Production must keep it `false`.
The Expo config plugin uploads native symbols and JavaScript source maps during
EAS Build. The Metro configuration uses Sentry's Expo serializer so every
exported bundle receives a debug ID.

EAS does not expose Secret variables while the CLI resolves Expo config before
submission. The config therefore validates `SENTRY_ORG` and `SENTRY_PROJECT`
during submission, then requires a correctly prefixed `SENTRY_AUTH_TOKEN` when
the remote builder sets `EAS_BUILD=true`. A missing upload token still fails the
cloud build before an artifact can be accepted.

Expo SDK 54 recommends Sentry React Native `~7.2.0`, but that version's custom
serializer fails against the locked Metro 0.83 export path. M0-T7 therefore
locks the blocking bugfix release `7.6.0` and records an Expo Doctor install
check exception. The application uses `getSentryExpoConfig`; do not replace it
with a nested custom serializer.

## Acceptance run

Do not check M0-T7 complete until all evidence below comes from real staging
deployments built from the same reviewed commit.

1. In Sentry, confirm Web, API, and Mobile projects exist and copy their real
   DSNs and project slugs into Vercel, Railway, and EAS.
2. Deploy Web/API/Worker staging and build an Android or iOS EAS Preview.
3. As an invited staging administrator, open `/ops`, use the Web Sentry smoke
   control, and record the displayed event ID.
4. Run the API smoke command inside the deployed API service:

   ```bash
   pnpm --filter @chinasupply/api sentry:smoke
   ```

   Record the JSON event ID, environment, and release. Confirm a Worker event
   separately by inspecting a deliberately captured test exception or a
   controlled Worker startup failure; never interrupt the production Worker.

5. In the EAS Preview app, use the Sentry smoke control and record the event ID.
6. For all three events, verify the Sentry environment and release. Web and API
   must contain the deployed commit. Mobile must contain the EAS artifact's
   application identifier, version, and build number.
7. Open the Web and Mobile event stack traces. Confirm frames resolve to the
   original TypeScript/TSX filenames and source lines rather than minified
   bundle offsets. Confirm the matching release artifacts/debug IDs appear in
   Sentry.
8. Repeat configuration inspection for production without sending a deliberate
   production exception. Confirm its environment resolves to `prod`.

Unit tests and local exports prove configuration and artifact generation only;
they do not substitute for the three received events or Sentry-side source map
symbolication.

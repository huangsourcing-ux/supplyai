# ChinaSupply.AI mobile

This directory contains the Expo Development Build application established from
Obytes Starter v9.0.0 during M0-T5.

The root route is the public industrial map. It uses the generated workspace API
client and the shared checked-in Streets v4 style to load MAP-1 cluster points,
MAP-2 boundaries at zoom 8 and above, and MAP-3 factory points at zoom 10 and
above. Viewport requests are debounced for 500ms and canceled when movement
starts. Factory clustering, selection cards, search, registration, OAuth,
account management, and logout UI remain in later M4 task packages.

Clerk tokens are stored in a dedicated encrypted MMKV instance. Its randomly
generated encryption key is persisted with Expo SecureStore and is never placed
in JavaScript configuration, EAS variables, or the repository.

## Commands

Run from the repository root:

```bash
pnpm --filter @chinasupply/mobile start
pnpm mobile:check
pnpm mobile:eas:preview -- --non-interactive --wait
```

`pnpm mobile:check` runs Expo Doctor, TypeScript, Expo public configuration,
and iOS/Android export-bundle checks. Native Preview builds are submitted from
this package directory by the root wrapper, so Expo discovers the monorepo root
and installs the pnpm workspace without a non-existent `workingDirectory`
property or custom Metro `watchFolders`.

The M0-T5c evidence build is the Android arm64-v8a Preview APK
`cf218fc6-750c-4d7c-804b-5082d52e650d`. It was installed without Metro on the
API 36 `diaoyouji_api_36` emulator; Clerk device trust, signed-in map rendering,
and process-level cold session restoration all passed. The Preview ABI limit is
only for this staging compatibility artifact; production ABI and signing policy
remain a later release concern.

The mobile runtime imports workspace packages through `workspace:*`. The
startup compatibility module executes the shared schema, geo, and i18n imports,
while the map route also consumes `@chinasupply/api-client` and
`@chinasupply/config/map/style`, so local Metro/export or EAS resolution
failures cannot be hidden by type erasure.

M0-T7 initializes Sentry before the Expo Router root layout and wraps the root
component for render failures. Its Expo plugin and Metro configuration upload
native artifacts and JavaScript source maps during EAS Build. A controlled
smoke control is visible only when
`EXPO_PUBLIC_SENTRY_SMOKE_ENABLED=true`; see
`docs/operations/sentry.md` for variables and acceptance evidence.

## EAS release triggers

- `apps/mobile/.eas/workflows/preview-build.yml` accepts only `rc-*` tags or an
  explicit EAS workflow dispatch and creates the existing Android Preview APK.
- `apps/mobile/.eas/workflows/production-release.yml` accepts only `v*` tags,
  pauses for EAS approval, then builds and submits iOS and Android separately.
- Pull requests, ordinary branches, and `main` never trigger EAS Build.

Production is intentionally dormant until Apple Developer and Google Play
accounts, confirmed store identifiers, production EAS environment values,
submission credentials, and the final reviewed icon exist. M0-T6 validates the
workflow contract only; M5-T10 owns the real Production Build and Submit.

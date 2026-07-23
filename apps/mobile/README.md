# ChinaSupply.AI mobile

This directory contains the Expo Development Build application established from
Obytes Starter v9.0.0 during M0-T5.

The signed-out shell provides the M0-T5c email/password and device-trust code
flow through Clerk Expo. Signed-in sessions continue to the offline MapLibre
compatibility spike from M0-T5b. Registration, OAuth, redirect handling,
account management, logout UI, and the production map remain outside this
milestone.

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

The mobile runtime imports TypeScript source directly from
`@chinasupply/schemas`, `@chinasupply/geo`, and `@chinasupply/i18n` using
`workspace:*`. The startup compatibility module executes all three imports so a
local Metro/export or EAS resolution failure cannot be hidden by type erasure.

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

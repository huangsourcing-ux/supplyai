# ChinaSupply.AI mobile

This directory contains the Expo Development Build application established from
Obytes Starter v9.0.0 during M0-T5.

The root route is the public industrial map. It uses the generated workspace API
client and the shared checked-in Streets v4 style to load MAP-1 cluster points,
MAP-2 boundaries at zoom 8 and above, and MAP-3 factory points at zoom 10 and
above. MAP-3 points use native MapLibre clustering with cluster expansion on
press. MAP-1 points, MAP-2 boundaries, and unclustered MAP-3 points open a
bottom card that renders the lightweight map identity immediately and fills in
the image and main products through A-2/A-5. Industrial-cluster cards now route
to `/clusters/[slug]`; factory detail remains visibly disabled until M4-T2c.

Viewport requests are debounced for 500ms and canceled when movement starts.
The first camera position is excluded from analytics; later settled movements
call the shared consent-aware analytics facade, which owns the ten-second
`map_moved` throttle. Mobile does not yet install a PostHog adapter or grant
analytics consent, so the facade remains a network no-op. A real Mobile adapter
and consent flow require a separately approved development-plan revision.

The native search control trims input, caps it at 100 characters, waits for two
characters, and debounces A-6 requests for 300ms. Results are grouped into
categories, industrial clusters, and factories, with loading, Retry, and empty
states; an empty result offers the first five A-7 root categories. The permanent
single-row category chips include All categories. Root filters show selection,
while a category returned at a deeper level keeps its exact slug in a removable
chip. Category changes cancel old MAP requests, clear stale map/card/truncation
state immediately, and apply the final slug after 500ms. Category results reset
to China; cluster and factory results fly to zoom 9 and 13 respectively and open
the existing card immediately. Search analytics uses the shared facade once per
successful response and therefore remains a network no-op on Mobile.

M4-T1 was validated against the canonical staging API with the preview
environment's platform-restricted MapTiler keys on an iPhone 17 Pro Simulator
(iOS 26.5) and the `diaoyouji_api_36` Android Emulator (API 36). Both platforms
passed basemap/attribution, cluster expansion, cluster and factory cards,
close, error/Retry recovery, disabled CTA accessibility, and crash-free smoke.
This is simulator coverage; physical-device and production-key gates remain
separate release work.

M4-T2a search was validated on the same iOS and Android simulator matrix with
the preview platform-restricted keys and canonical staging API. Both platforms
passed `led`, `socks`, `sofa`, `家具`, no-result popular categories, search
failure/Retry recovery, category MAP filtering, cluster/factory positioning and
cards, attribution, and crash-free interaction. Registration, OAuth, account
management, and logout UI remain in later M4 task packages.

The M4-T2b cluster-detail implementation uses A-2 and cursor-based A-3 through
the generated API client. A single `FlatList` renders the identity, disabled
save placeholder, static boundary/centroid map, optional stats and Markdown,
and deduplicated factory pages. Markdown ignores raw HTML and permits only
HTTP(S) links and images. Loading, 404, service, empty-list, initial-page,
next-page, and map failures each expose an appropriate retry or return action.
The shared analytics facade receives one `cluster_viewed` call after A-2
succeeds and remains a network no-op without Mobile consent and an adapter.

On the existing iOS 26.5 Simulator and Android API 36 Emulator, the preview
platform-restricted keys and canonical staging API passed map-card entry,
direct deep linking, boundary fitting, attribution, five factory cards,
disabled future actions, return-to-map, and crash-free interaction. Canonical
staging currently has only two published clusters; both omit description and
stats, and the largest has five factories. Therefore real-data Markdown and a
second A-3 cursor page remain an acceptance blocker even though their unit
coverage passes. M4-T2b stays unchecked until those two staging paths are
smoked with approved published data.

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

Clean native prebuilds require the checked-in `@clerk/expo` config plugin. It
sets Clerk's iOS 17 minimum and registers the Clerk Swift Package dependencies;
removing it makes the generated iOS CocoaPods integration invalid.

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

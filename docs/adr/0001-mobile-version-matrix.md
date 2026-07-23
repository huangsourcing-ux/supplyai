# ADR-0001: Mobile compatibility version matrix

- Status: Accepted; simulator matrix validated in M0-T5b
- Date: 2026-07-22
- Owners: Mobile / Platform

## Context

ChinaSupply.AI requires the Obytes Starter skeleton, Expo Development Build,
React Native New Architecture, NativeWind, and MapLibre React Native v11. The
combination must be selected before mobile feature work starts and then remain
stable throughout V1.

Obytes v9 moved its styling layer from NativeWind to Uniwind. Using that default
would conflict with the frozen project stack. Obytes v8 still uses NativeWind,
but its Expo 53 / React Native 0.79 baseline is below MapLibre React Native v11's
declared Expo and React Native peer ranges.

## Decision

Use Obytes Starter v9.0.0 as the structural baseline and replace Uniwind with
NativeWind. Do not track the Obytes `master` branch.

| Component               | Locked or selected version                            | Evidence / status                                                                               |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Obytes Starter          | `v9.0.0` (`a8ded50fdb41e75ec2e919ae2410bcdc2fdad0c8`) | Migrated into the monorepo in M0-T5a                                                            |
| Expo SDK                | `54.0.36`                                             | Obytes v9 declares `~54.0.32`; locked to the SDK 54 patch required by Expo Doctor on 2026-07-22 |
| React Native            | `0.81.5`                                              | Locked; New Architecture enabled                                                                |
| React                   | `19.1.0`                                              | Locked to the Expo/Obytes baseline                                                              |
| Expo Router             | `6.0.24`                                              | Obytes v9 declares `~6.0.22`; locked to the SDK 54 patch required by Expo Doctor on 2026-07-22  |
| NativeWind              | `4.2.6`                                               | Replaces Uniwind; verified by T5a static/export checks                                          |
| Tailwind CSS            | `3.4.19`                                              | Locked for NativeWind v4                                                                        |
| MapLibre React Native   | `11.3.6`                                              | Installed and validated on iOS/Android simulators in M0-T5b                                     |
| MapLibre Native iOS     | `6.26.0`                                              | Resolved by Swift Package Manager during the iOS M0-T5b build                                   |
| MapLibre Native Android | `13.2.0`                                              | Declared by MapLibre RN 11.3.6 and resolved by the Android M0-T5b build                         |

`newArchEnabled` is explicitly `true`. MapLibre React Native v11 only supports
New Architecture, so disabling it is not an available fallback.

The application uses these provisional identities:

| Environment | iOS Bundle ID / Android package | URL scheme            |
| ----------- | ------------------------------- | --------------------- |
| Local       | `ai.chinasupply.app.local`      | `chinasupply.local`   |
| Staging     | `ai.chinasupply.app.staging`    | `chinasupply.staging` |
| Production  | `ai.chinasupply.app`            | `chinasupply`         |

The identifiers are not reserved in Apple Developer or Google Play Console.
They may be used for local and Preview validation, but availability must be
rechecked before device signing or store registration. No EAS project ID is
committed in M0-T5a.

## Styling divergence (accepted)

Web runs Tailwind `4.1.18` with the v4 CSS-first `@theme` configuration and no
`tailwind.config.js`. Mobile is pinned to Tailwind `3.4.19` because NativeWind
v4 requires it. The two ends therefore run different Tailwind majors with
different configuration styles.

`@chinasupply/config/tailwind/preset` is a v3-style JavaScript preset. It is
consumed only by `apps/mobile`; `apps/web` does not consume it. Design tokens
(colors, spacing, typography) are consequently **not shared across ends today**
and will drift unless they are kept aligned by hand.

The frozen stack entry "RN: NativeWind / 三端统一 Tailwind 写法" is therefore
honored in its letter (NativeWind is used) but only partially in its intent
(the unified Tailwind authoring model is split across majors). This is accepted
for V1 in exchange for the battle-tested NativeWind v4 combination. Unifying on
Tailwind v4 requires NativeWind v5 to stabilize; when it does, it must go
through a new compatibility spike under the upgrade policy below, and this ADR
must be updated.

## Validation boundary

M0-T5a proves the Obytes-derived shell works inside the pnpm workspace through
Expo Doctor, TypeScript, public config evaluation, and iOS/Android JavaScript
export bundles. These checks do not prove native MapLibre compatibility.

M0-T5b installed MapLibre `11.3.6` and its Expo config plugin. A clean prebuild
generated the expected `$MLRN.post_install(installer)` hook in the Podfile, and
the generated native directories remain gitignored. The spike uses an embedded
background-only style with no remote sources, URLs, tiles, glyphs, sprites, or
keys. It renders WGS-84 fixtures around Yiwu: a point, a closed Polygon, and a
cluster-enabled GeoJSON collection with `point_count` filters.

## M0-T5b simulator evidence

Validation was performed on 2026-07-22 with New Architecture enabled:

| Platform | Build environment                                                                        | Runtime evidence                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Xcode `26.6`; iPhone 17 Pro Simulator, iOS `26.5`; `ChinaSupplyAILocal` Debug scheme     | Native build/install/launch succeeded in 222.9 seconds. Screenshot SHA-256: `7d8e2045a1285118f3a36f9838c223bf2de0e126743e90b6ac28fff787dd7de2`.                              |
| Android  | Emulator `36.6.11`; AVD `diaoyouji_api_36`; API/compile/target SDK `36`; arm64-v8a Debug | Gradle build succeeded in 5 minutes 56 seconds, then the APK installed and launched. Screenshot SHA-256: `56d9a6228c3007d24e548242cc4b6f034f18b254f88315675fd3b2aff4a54d6c`. |

Both screenshots show the blue point, translucent Polygon, orange cluster,
legend, required attribution, and the `Offline map ready` state. iOS runtime
logs and Android steady-state logcat contain no native crash or MapLibre
style/source loading error. Android emitted React Native fallback warnings for
missing generated ViewManager setters. iOS emitted two non-fatal
`FilterPropsConversions` diagnostics because React Native 0.81 also interprets
the MapLibre layer prop named `filter` as a View CSS filter; the actual
`point_count` cluster and inverse filters rendered correctly. These diagnostics
must be rechecked during any future framework upgrade, but they did not block
the validated simulator behavior.

This evidence establishes simulator compatibility only. It does not satisfy
the M0 physical-device gate, app signing, store identifier reservation, or a
real network basemap test. Physical iOS and Android validation remains an
explicit human gate; the MapTiler-backed product style remains M0-T10 scope.

M0-T5c owns Clerk Expo, imports from `packages/schemas`, `packages/geo`, and
`packages/i18n`, EAS monorepo working-directory configuration, and at least one
successful Preview build.

## Upgrade policy

M0-T5b validated the simulator matrix. V1 therefore permits only security
updates and fixes for blocking defects. Expo, React Native, Obytes, MapLibre,
and NativeWind major upgrades require a new compatibility spike and an ADR
update.

## Primary references

- [Obytes v9.0.0 package manifest](https://raw.githubusercontent.com/obytes/react-native-template-obytes/v9.0.0/package.json)
- [Expo New Architecture guide](https://docs.expo.dev/guides/new-architecture/)
- [MapLibre React Native v11 migration guide](https://maplibre.org/maplibre-react-native/docs/setup/migrations/v11/)

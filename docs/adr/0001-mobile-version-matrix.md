# ADR-0001: Mobile compatibility version matrix

- Status: Accepted for M0 spike; native validation pending M0-T5b
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

| Component             | Locked or selected version                            | Evidence / status                                                                               |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Obytes Starter        | `v9.0.0` (`a8ded50fdb41e75ec2e919ae2410bcdc2fdad0c8`) | Migrated into the monorepo in M0-T5a                                                            |
| Expo SDK              | `54.0.36`                                             | Obytes v9 declares `~54.0.32`; locked to the SDK 54 patch required by Expo Doctor on 2026-07-22 |
| React Native          | `0.81.5`                                              | Locked; New Architecture enabled                                                                |
| React                 | `19.1.0`                                              | Locked to the Expo/Obytes baseline                                                              |
| Expo Router           | `6.0.24`                                              | Obytes v9 declares `~6.0.22`; locked to the SDK 54 patch required by Expo Doctor on 2026-07-22  |
| NativeWind            | `4.2.6`                                               | Replaces Uniwind; verified by T5a static/export checks                                          |
| Tailwind CSS          | `3.4.19`                                              | Locked for NativeWind v4                                                                        |
| MapLibre React Native | `11.3.6`                                              | Selected only; install, prebuild, native build, and rendering evidence belong to M0-T5b         |

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

M0-T5b must add MapLibre `11.3.6` and its config plugin, run iOS and Android dev
builds, and render a point, Polygon, and clustered points. Only after that
evidence exists may this ADR describe the native version combination as
validated.

M0-T5c owns Clerk Expo, imports from `packages/schemas`, `packages/geo`, and
`packages/i18n`, EAS monorepo working-directory configuration, and at least one
successful Preview build.

## Upgrade policy

After M0-T5b validates the matrix, V1 permits only security updates and fixes
for blocking defects. Expo, React Native, Obytes, MapLibre, and NativeWind major
upgrades require a new compatibility spike and an ADR update.

## Primary references

- [Obytes v9.0.0 package manifest](https://raw.githubusercontent.com/obytes/react-native-template-obytes/v9.0.0/package.json)
- [Expo New Architecture guide](https://docs.expo.dev/guides/new-architecture/)
- [MapLibre React Native v11 migration guide](https://maplibre.org/maplibre-react-native/docs/setup/migrations/v11/)

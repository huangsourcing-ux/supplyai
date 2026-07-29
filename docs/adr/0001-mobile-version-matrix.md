# ADR-0001: Mobile compatibility version matrix

- Status: Accepted; M0-T5 compatibility matrix validated in M0-T5c
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
| Clerk Expo              | `4.0.1`                                               | Email-code sign-up/sign-in, email MFA/client trust, and Google browser SSO validated natively   |
| Expo Auth Session       | `7.0.11`                                              | SDK 54-compatible native OAuth redirect support; iOS/Android builds validated                   |
| Expo Web Browser        | `15.0.11`                                             | SDK 54-compatible Google browser SSO; open/cancel validated on iOS and Android                  |
| Expo SecureStore        | `15.0.8`                                              | Persists only the MMKV encryption key                                                           |
| Expo Crypto             | `15.0.9`                                              | Generates the random 16-byte MMKV encryption key                                                |
| Expo Clipboard          | `8.0.8`                                               | SDK 54-compatible address and WeChat copy support; native iOS/Android builds validated          |
| MapLibre React Native   | `11.3.6`                                              | Installed and validated on iOS/Android simulators in M0-T5b                                     |
| MapLibre Native iOS     | `6.26.0`                                              | Resolved by Swift Package Manager during the iOS M0-T5b build                                   |
| MapLibre Native Android | `13.2.0`                                              | Declared by MapLibre RN 11.3.6 and resolved by the Android M0-T5b build                         |
| EAS CLI                 | `21.1.0`                                              | Used for project linking, config evaluation, and the M0-T5c Preview build                       |

`newArchEnabled` is explicitly `true`. MapLibre React Native v11 only supports
New Architecture, so disabling it is not an available fallback.

Clerk Expo's checked-in config plugin is required in every prebuild. It raises
the generated iOS deployment target to Clerk iOS SDK's minimum of iOS 17 and
registers the native Swift Package Manager dependencies; omitting it leaves a
clean iOS prebuild without a valid `ClerkExpo` pod target.

The application uses these provisional identities:

| Environment | iOS Bundle ID / Android package | URL scheme            |
| ----------- | ------------------------------- | --------------------- |
| Local       | `ai.chinasupply.app.local`      | `chinasupply.local`   |
| Staging     | `ai.chinasupply.app.staging`    | `chinasupply.staging` |
| Production  | `ai.chinasupply.app`            | `chinasupply`         |

The identifiers are not reserved in Apple Developer or Google Play Console.
They may be used for local and Preview validation, but availability must be
rechecked before device signing or store registration. No EAS project ID is
committed in M0-T5a. M0-T5c linked the staging candidate to EAS project
`@huangsourcing/chinasupply-ai` with project ID
`cac33d97-75d7-4975-899f-00d661bf979d`; this does not reserve either store
identifier.

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
`packages/i18n`, EAS monorepo resolution, and at least one successful Preview
build.

## M0-T5c Preview and authentication evidence

The mobile app consumes the three shared packages through `workspace:*` under
pnpm's isolated linker. Each package exports TypeScript source directly. The
startup compatibility module executes `localizedTextSchema.parse`, the WGS-84
range check, and a shared English resource lookup, so Metro and EAS cannot hide
a broken workspace link behind type-only imports. Expo SDK 54 discovers the
monorepo root from `apps/mobile`; no unsupported EAS `workingDirectory`, custom
Metro `watchFolders`, or hoisted linker is used.

The Expo project was built from `apps/mobile` with the `preview` profile,
internal distribution, the EAS `preview` environment, Node `22.23.1`, and an
arm64-v8a Android APK. The environment contained only the staging app selector,
the real HTTPS staging API URL, and the Clerk Development publishable key.
Passwords, session tokens, and future integration placeholders were not
uploaded.

| Evidence             | Result                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| EAS build            | `cf218fc6-750c-4d7c-804b-5082d52e650d`, `FINISHED` on 2026-07-23 UTC; build duration 621.151 seconds          |
| Build URL            | `https://expo.dev/accounts/huangsourcing/projects/chinasupply-ai/builds/cf218fc6-750c-4d7c-804b-5082d52e650d` |
| APK                  | 65,288,599 bytes; SHA-256 `4dc18155226bd520d29324c9f254228cb58e02515ac5b52965844d959ce332c3`                  |
| Login screen         | SHA-256 `a22e1d7a1fe6ed23c450bbb3adc60942654a7edbbb09ad0e73c5d4dc77eeb051`                                    |
| Device-trust screen  | SHA-256 `0ff5521c9c8056b9e3d7eecf3c9e95af8c739ec0d8808ca62a6bf625144ff0ee`                                    |
| Authenticated map    | SHA-256 `eedda875542f09895f11f478b8caac75f843f8311e381e310a44837f5c551663`                                    |
| Cold-session restore | SHA-256 `defd099458c16ff940a5ba0efbf9338df68861a4ca7709da53225ceb0a403a12`                                    |

The APK installed on the `diaoyouji_api_36` API 36 arm64 emulator and launched
without Metro. A real Clerk Development user completed email/password sign-in
and the first-device email-code trust step. Clerk tokens use a dedicated AES
encrypted MMKV instance; its random 16-byte encryption key is held by
SecureStore with this-device-only accessibility. After `am force-stop` removed
the process, a cold launch restored the signed-in session and rendered the
offline MapLibre fixture. The post-restore logcat contained no native fatal,
React Native, Clerk/session, or MapLibre style/source error.

Isolated cloud resolution exposed three build/runtime integration defects that
local linking alone did not prove: Babel needed an explicit JSX transform
dependency, Android packaging needed the duplicate OSGi manifest excluded, and
Expo public environment reads needed static property access for Metro inlining.
Those fixes are locked with `@babel/plugin-transform-react-jsx@7.29.7` and
`expo-build-properties@1.0.10`; the successful artifact above contains all
three shared runtime imports.

M0-T5 is complete at the approved compatibility-spike boundary. This evidence
does not satisfy the M0 physical-device gate, app-store signing or identifier
reservation, user OAuth/redirect/account pages, or the MapTiler-backed product
map. Those remain human gates or later task scope.

## M4-T1 product-map simulator evidence

The MapTiler-backed product map was validated on 2026-07-27 with the preview
environment's real platform-restricted keys and
`https://api-staging.chinasupply.ai/api/v1`:

| Platform | Native build                                                                               | Runtime evidence                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Xcode `26.6`; `ChinaSupplyAIStaging` Debug; iPhone 17 Pro Simulator on iOS `26.5`          | Clean prebuild and CocoaPods install succeeded after restoring the required Clerk Expo plugin; cached native rebuild completed in 24.9 seconds. Basemap/attribution, MAP-1 card, zoom-10 factory cluster expansion, MAP-3 card, close, forced detail error and successful Retry passed. |
| Android  | Emulator `36.6.11`; `diaoyouji_api_36`; Android/API `36`; `ChinaSupplyAIStaging` Debug APK | Gradle completed 548 tasks and installed the APK. Basemap/attribution, MAP-1 card, zoom-10 factory cluster expansion, MAP-3 card, close, offline detail error and successful Retry passed.                                                                                              |

The iOS accessibility snapshots exposed Close and Retry as enabled controls,
kept the detail CTA out of actionable targets while disabled, and retained the
attribution text. Android UIAutomator reported the same enabled/disabled states.
Both runtimes completed the interactions without a native crash. Intermittent
MapTiler tile/glyph timeouts and existing shared-style compatibility warnings
were recoverable and did not prevent data layers or interaction completion.
No EAS build, deployment, external write, or analytics network adapter was
triggered. Physical-device and production-key validation remain later release
gates and are not implied by this simulator evidence.

## M4-T2a App-search simulator evidence

App search was validated on 2026-07-27 using the M4-T1 native builds, the
preview environment's real platform-restricted MapTiler keys, and the canonical
staging API. Runtime-only fault injection was limited to A-6, then removed; it
did not change the application, dependencies, generated client, or repository.

| Platform | Search evidence                                                                                                                                                                                                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | iPhone 17 Pro Simulator / iOS 26.5 passed `led`, `socks`, `sofa`, `家具`, all three result groups, empty-state popular categories, root and exact child category filtering, zoom-9 cluster and zoom-13 factory positioning with immediate cards, forced A-6 failure and successful Retry, attribution, and crash-free interaction. |
| Android  | `diaoyouji_api_36` / API 36 passed the same query, result, category, positioning, card, failure/Retry, attribution, and crash-free paths. Unicode input was injected with a temporary emulator-only IME, which was restored to Gboard and uninstalled after evidence capture.                                                      |

Persistent-connection A-6 warm requests completed in `239.1/234.4ms` for
`led`, `235.7/230.7ms` for `socks`, `229.2/212.9ms` for `sofa`, and
`218.5/212.8ms` for `家具`; every warm sample was below 500ms. A direct
101-character query returned HTTP 400. The analytics facade remained a network
no-op, detail CTAs remained disabled, and no EAS build, canonical staging or
production deployment, production credential, PostHog adapter, Consent flow,
or permanent Maestro dependency was introduced. The PR's automatic Vercel
Preview completed successfully.

## M4-T2b cluster-detail simulator evidence

The cluster-detail implementation was exercised on 2026-07-27 with the preview
environment's real platform-restricted MapTiler keys and
`https://api-staging.chinasupply.ai/api/v1`. The implementation adds no Mobile
PostHog adapter, consent grant, EAS build, deployment, or production setting.

| Platform | Native/runtime evidence                                                                                                                                                                                                                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Xcode 26.6 built and launched `ChinaSupplyAIStaging` Debug on the iPhone 17 Pro / iOS 26.5 Simulator in 18.0 seconds. Map search → cluster card → `/clusters/[slug]`, boundary fitting, MapTiler/OSM attribution, disabled save and factory actions, all five factories, return-to-map, and a system-confirmed direct deep link passed without a native crash. |
| Android  | Gradle assembled and installed the staging Debug APK on `diaoyouji_api_36` / API 36 (`548` tasks, 22 seconds). The same map-card, detail, boundary/attribution, five-factory scrolling, disabled-action, return, and direct deep-link paths passed without a native crash.                                                                                     |

The canonical staging inventory contains two published clusters. Both return
`description: null` and `stats: null`; the larger A-3 collection has five
factories, below the 20-item page size. Optional-block hiding was observed on
both platforms, while safe Markdown rendering and cursor-page merge/deduplication
passed unit tests. Real-data Markdown and a second A-3 cursor page could not be
smoked without changing staging content. Under the Owner-approved development
plan v1.3 acceptance, the real canonical main path plus fixed fixture coverage
closes M4-T2b. A 21+ real-data cursor regression is opportunistic in M5 only
when reviewed data naturally supports it; staging data must not be distorted to
manufacture a second page.

## M4-T2c factory-detail simulator evidence

The factory-detail implementation was exercised on 2026-07-28 with the preview
environment's real platform-restricted MapTiler keys and
`https://api-staging.chinasupply.ai/api/v1`. CocoaPods and Gradle both resolved
Expo Clipboard `8.0.8`. The implementation adds no Mobile PostHog adapter,
consent grant, Maestro dependency, EAS build, deployment, or production
setting.

| Platform | Native/runtime evidence                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Xcode 26.6 built and installed `ChinaSupplyAIStaging` Debug from a fresh derived-data directory on the iPhone 17 Pro / iOS 26.5 Simulator. Direct `/factories/[slug]` deep linking, A-5 identity/facts, the zoom-14 point map and MapTiler/OSM attribution, Website handoff, a related-factory route, disabled iOS navigation placeholders, and return handling passed without a native crash. |
| Android  | Gradle built and installed the staging Debug APK on `diaoyouji_api_36` / API 36. The same detail/map/attribution/Website/related paths passed; Android also confirmed English address copy feedback, Android-only navigation placeholders, and an offline service error whose Retry succeeded after network restoration. Logcat contained no fatal exception for the staging app.              |

Canonical staging exposes six published factories. All are verified, all omit
images, certifications, MOQ, establishment year, and employee scale, and all
offer Website as their only contact method; none exposes Email, Phone, or
WeChat. Five return non-empty `relatedFactories`. Fixed A-5 fixtures cover the
missing image cardinalities, unverified state, optional facts, all four contact
actions, safe URLs, copy failure, and map failure/Retry, but those fixtures do
satisfy the Owner-approved development plan v1.3 branch acceptance together
with the canonical main-path smoke, closing M4-T2c. Real media cannot be
accepted before M5-T1 delivers ADM-6; reviewed optional contacts, media, and
dual-platform Phone dialer handoff move to M5-T2. Unverified remains a fixture
branch rather than a reason to keep a deliberately unverified factory public.

## M4-T3a App-auth and account simulator evidence

M4-T3a was exercised on 2026-07-28 with the Clerk Development instance, the
canonical staging API, and the exact staging callback
`chinasupply.staging://sso-callback`. The callback was added only to the staging
Clerk allowlist; no production configuration was created.

| Platform | Native/runtime evidence                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Xcode 26.6 built and launched `ChinaSupplyAIStaging` Debug on the iPhone 17 Pro / iOS 26.5 Simulator. A disposable Clerk test-email flow passed registration, English locale save, sign-out, existing-user email-code sign-in, inline account-deletion confirmation, and return to the public Map. Clerk deletion, core tombstone, zero favorites, and the delete webhook were confirmed. |
| Android  | Gradle completed 548 tasks and installed the staging Debug APK on `diaoyouji_api_36` / API 36 with Expo Web Browser 15.0.11 linked. The same disposable email lifecycle and deletion evidence passed after a cold emulator boot; logcat contained no App fatal exception.                                                                                                                 |

Both native builds opened the real Google browser OAuth surface and returned
cleanly on cancellation. Unit tests cover successful activation, cancellation,
and failure, but no available non-admin Google test identity could complete a
real successful Google session and does not treat the simulated success path as
real OAuth acceptance. On 2026-07-28 the Owner explicitly approved this
evidence boundary and authorized M4-T3a closeout after regression tests locked
the Clerk SDK options for default and explicit `web-only` versus
`web-or-native`, plus the Admin guard's omitted policy argument. Existing
shared MapLibre style warnings and one recoverable Android React Host startup
diagnostic were unrelated to authentication and did not prevent the tested
lifecycle.

## M4-T3b App-favorites simulator evidence

M4-T3b was exercised on 2026-07-28 against the canonical staging API with the
same disposable Clerk Development user on both platforms. No production
configuration or canonical content was changed.

| Platform | Native/runtime evidence                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Xcode 26.6 built and launched `ChinaSupplyAIStaging` Debug on the iPhone 17 Pro / iOS 26.5 Simulator. Anonymous Saved opened standalone email authentication and returned automatically; cluster and factory details created favorites, both lists and detail routing rendered, and focus revalidation observed Android removals.                                   |
| Android  | Gradle installed the current staging Debug APK on `diaoyouji_api_36` / API 36. The same account observed both iOS-created favorites, opened cluster details, rendered an injected request failure and recovered through Retry, removed both target types, and completed shared 401 session cleanup after account deletion; logcat contained no App fatal exception. |

The smoke also verified the restricted platform MapTiler keys and existing map
attribution on the surrounding routes. Fixed tests cover cursor page
deduplication and boundaries, `target=null`, invalid return targets, idempotent
POST cache upsert, optimistic DELETE rollback, per-user cache isolation,
Bearer injection, focus revalidation, and 401 cleanup. Favorites were empty
before the disposable account deletion request returned
`deletionRequested: true`; both platforms then showed the signed-out Saved
guidance. Temporary credentials and logs were not retained.

## M4-T4 Explore simulator evidence

M4-T4 was exercised on 2026-07-29 against the canonical staging API with the
preview environment's platform-restricted MapTiler keys. The implementation
directly pins `@expo/vector-icons@15.1.1` and its Expo SDK peer
`expo-font~14.0.12`; Expo Doctor confirms the locked SDK 54 matrix. No API,
schema, generated client, analytics adapter, deployment, or canonical content
was changed.

| Platform | Native/runtime evidence                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Xcode 26.6 built and launched `ChinaSupplyAIStaging` Debug on the iPhone 17 Pro / iOS 26.5 Simulator in 21.2 seconds. Map → Explore → Saved → Account, the nine server-ordered category colors/icons, Electronics and Home Textiles A-1 results, Dongguan cluster-detail round trip, Lighting empty state, retained Explore stack, and return handling passed without a native crash.       |
| Android  | Gradle completed 549 tasks and installed the staging Debug APK on `diaoyouji_api_36` / API 36 in 15 seconds. The same grid/list/detail/empty paths passed; Android additionally used real airplane mode to produce an uncached Furniture service error, restored connectivity, and reached the canonical empty state through Retry. Package-scoped logcat contained no App fatal exception. |

The canonical inventory has no Explore category with more than 20 published
clusters, so a real second A-1 page cannot be exercised without distorting
reviewed data. Fixed tests pass the exact `nextCursor` into the generated A-1
client, merge two pages, deduplicate a repeated ID, and cover continuation
failure/Retry. Other fixtures cover malformed, unknown, and child-category
slugs, null/unknown icon fallback, image and color-placeholder cards, first-page
failure, and empty categories. This evidence boundary closes F-10.1 while
leaving M4-T5 navigation, M4-T6 Maestro, Mobile PostHog/Consent, EAS, and
production unchanged.

## Upgrade policy

M0-T5 validated the simulator and Preview matrix. V1 therefore permits only security
updates and fixes for blocking defects. Expo, React Native, Obytes, MapLibre,
and NativeWind major upgrades require a new compatibility spike and an ADR
update.

## Primary references

- [Obytes v9.0.0 package manifest](https://raw.githubusercontent.com/obytes/react-native-template-obytes/v9.0.0/package.json)
- [Expo New Architecture guide](https://docs.expo.dev/guides/new-architecture/)
- [MapLibre React Native v11 migration guide](https://maplibre.org/maplibre-react-native/docs/setup/migrations/v11/)

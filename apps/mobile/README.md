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
to `/clusters/[slug]`; factory cards route to `/factories/[slug]` from both the
map and the cluster factory list.

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
cards, attribution, and crash-free interaction.

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

The M4-T2c factory-detail implementation loads A-5 through the generated client
and supports direct `/factories/[slug]` deep links. It renders verification and
source metadata, an optional paged image gallery, only the available factory
facts, a read-only zoom-14 WGS-84 point map, bilingual address copy, safe
Website/Email/Phone/WeChat actions, and a related-factory rail. Loading, 404,
service, copy, external-link, and map failures remain recoverable. Navigation
providers were deliberately disabled placeholders at that checkpoint; save
was still an M4-T3b concern. One `factory_viewed` and each contact action use
the shared analytics facade, which remains a network no-op without Mobile
consent and an adapter.

On the iPhone 17 Pro / iOS 26.5 Simulator and `diaoyouji_api_36` / API 36
Emulator, preview platform-restricted keys plus the canonical staging API
passed direct deep linking, map and cluster-list entry routing, A-5 rendering,
the Streets v4 point map and attribution, Website handoff, related-factory
routing, return handling, and crash-free interaction. Android additionally
proved English address copy feedback and an offline service failure followed by
a successful Retry after network restoration. Canonical staging currently has
six published factories: all are verified, none has images, certifications,
MOQ, establishment year, employee scale, Email, Phone, or WeChat, and Website
is the only contact method. Five return related factories. Those missing
real-data variants remain the acceptance blocker, so M4-T2c stays unchecked
despite fixed-fixture unit coverage.

M4-T3a moves the public Map into an Expo Router Tabs shell with only Map and
Account visible. Email sign-up/sign-in and email MFA/client trust use Clerk
verification codes; Google uses browser SSO with the exact staging callback
`chinasupply.staging://sso-callback`. Account displays the primary email and the
only supported locale, English. Saving calls A-9 with a Bearer token; sign-out,
A-10 deletion, and protected-request 401 handling share the same session
cleanup and return to the anonymous Map. Deletion requires an inline second
confirmation and completes local cleanup even if Clerk sign-out then fails.

Clerk tokens are stored in a dedicated encrypted MMKV instance. Its randomly
generated encryption key is persisted with Expo SecureStore and is never placed
in JavaScript configuration, EAS variables, or the repository. Session cleanup
clears the MMKV token and the complete React Query cache while retaining that
non-token SecureStore encryption key.

The iPhone 17 Pro / iOS 26.5 Simulator and `diaoyouji_api_36` / API 36 Emulator
each passed a disposable email-code registration → locale save → sign-out →
existing-user sign-in → App deletion lifecycle against canonical staging.
Read-only checks confirmed Clerk deletion, core tombstones, zero favorites, and
successful delete webhooks without retaining emails or credentials. Both
platforms also opened and cleanly canceled the real Google browser flow; unit
tests cover Google success/cancel/failure. Real successful Google OAuth was not
run because no non-admin test identity was available and is not recorded as
passed. On 2026-07-28 the Owner explicitly approved this evidence boundary and
closed M4-T3a after verifier-level `authorizedParties` tests and the strict
Admin guard call-site assertion were added.

M4-T3b adds Saved between Map and Account. Signed-out users and unsigned detail
actions open the standalone `/sign-in` route; successful email sign-in or
registration returns only to `/saved`, `/clusters/<slug>`, or
`/factories/<slug>`, with every other `returnTo` value falling back to Saved.
The user-scoped `['favorites', clerkUserId]` cache consumes the generated A-8
client in 20-item cursor pages, deduplicates page edges, injects Clerk Bearer
tokens, revalidates when Saved regains focus, and shares the existing 401
session cleanup. Detail pages create favorites idempotently; Saved owns
optimistic removal and rollback. Factories are shown first, Industrial clusters
are switchable, and unavailable `target=null` entries remain removable without
exposing unpublished content.

On 2026-07-28 the iPhone 17 Pro / iOS 26.5 Simulator and
`diaoyouji_api_36` / API 36 Emulator used the restricted preview MapTiler keys
and canonical staging API to pass anonymous guidance → email login → automatic
return, both detail save actions, both Saved lists, detail routing, cross-device
sync, both removals, an injected service failure followed by Retry, focus
revalidation, and post-deletion 401 cleanup without an App crash. The temporary
favorites and disposable Clerk test account were removed; canonical content and
production were unchanged.

M4-T4 adds Explore between Map and Saved, fixing the tab order as Map → Explore
→ Saved → Account. `/explore` consumes the generated A-7 client and renders the
server-ordered root categories as a two-column, accessible color/icon grid.
The nine current API icon names are mapped explicitly to Font Awesome 6, with a
`shapes` fallback for null or future values. `/explore/[slug]` rejects malformed,
unknown, and child-category slugs before A-1; valid roots request the exact slug
in 20-item pages, pass opaque cursors unchanged, deduplicate page boundaries by
cluster ID, and support automatic scrolling plus an explicit continuation
fallback. Cluster cards route to the existing detail screen and preserve the
Explore list when users return. Loading, empty, unavailable, initial-error, and
continuation-error states all provide a useful next action.

On 2026-07-29 the iPhone 17 Pro / iOS 26.5 Simulator and
`diaoyouji_api_36` / API 36 Emulator used the restricted preview MapTiler keys
and canonical staging API to pass the four-tab order, all nine category colors
and icons, Electronics and Home Textiles lists, cluster-detail round trips, and
the real Lighting empty state without an App crash. Android additionally passed
a real airplane-mode service failure followed by network restoration and Retry.
The iOS error and Retry branches and the unavailable second cursor page are
covered by fixed automated fixtures; canonical staging data was not changed to
manufacture pagination.

M4-T5 replaces the factory-detail navigation placeholders with the M0-T9
approved Google, Apple (iOS only), Amap, and Baidu route-planning links. A-5
WGS-84 coordinates pass unchanged to `@chinasupply/geo/navigation`. Apple and
Google use their single HTTPS handoff; Amap and Baidu try their platform App URI
and open the approved Web URL only if React Native rejects that handoff. The
App does not query installation state, so no native scheme/package visibility
configuration is added. Each press makes one coordinate-free
`navigation_clicked` facade call, still a network no-op without Mobile consent
and an adapter. Unit coverage includes both platforms, App success, Web
fallback, duplicate-HTTPS prevention, double failure, and localized recovery.

Local Preview smoke used the canonical `dongguan-oppo-mobile` A-5 response and
Release configuration on iPhone 17 Pro / iOS 26.5 Simulator plus
`diaoyouji_api_36` / API 36 Emulator. iOS exposed all four links, handed Apple
Maps to route planning, and fell back from an absent Amap App URI to an OPPO
destination on `amap.com`. Android exposed only Google/Amap/Baidu, handed the
reviewed WGS-84 destination to installed Google Maps, and recorded an absent
Amap URI followed by a successful HTTPS handoff. Both returned to the App
without a fatal error. The fresh Android image stopped at Chrome's first-run
terms screen; no terms were accepted and no Web page rendering is claimed.
These local results are integration smoke, not F-6.4 landing evidence.

On 2026-07-29 the Owner explicitly confirmed completion of the full 13-row
F-6.4 Release physical-device matrix and that every observed destination was
less than 50 metres from the reviewed factory entrance. M4-T5 is therefore
closed. The per-device build,
OS, map-App version, and measurement records were not supplied for repository
transcription; the closeout record preserves the Owner's acceptance without
inventing those fields.

M4-T6 adds a staging-only Maestro journey under `.maestro/`. It clears App
state, waits for both the base map and requested map data, verifies anonymous
Saved guidance, searches the canonical Dongguan cluster, enters the canonical
OPPO factory, signs up with a disposable Clerk test email, saves and removes
both target types, checks the platform navigation-button set, signs out, signs
back in, and deletes the account after the second confirmation. An
`onFlowComplete` hook re-enters the account and deletes it when a failure occurs
after registration. Exact OPPO WGS-84 navigation URLs remain unit assertions;
Maestro does not infer them from an external map App's rewritten address bar.

The iPhone 17 Pro / iOS 26.5 Simulator and `diaoyouji_api_36` / Android API 36
Emulator both passed the complete flow against canonical staging on 2026-07-29.
Aggregate read-only checks then confirmed every M4-T6 Clerk user absent, every
core user retained only as a tombstone, zero favorites, and successful delete
webhook receipts. Canonical content, EAS, CI, and production were unchanged.
M4-T7 adds the offline store-compliance package. iOS uses Clerk's native Sign
in with Apple whenever social login is enabled; Apple and Google are hidden
together when `EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED` is not `true`, while Android
continues to offer Google. Production configuration rejects a disabled Apple
flag. Email verification remains available on both platforms. Successful Apple
sessions use the existing auth completion/return path; cancellation is silent
and failures remain localized.

The login/registration card and signed-in Account page open environment-aware
Privacy Policy and Terms of Use pages through the in-App browser with Retry.
Local/Staging use `https://staging.chinasupply.ai`; Production uses
`https://www.chinasupply.ai`. Expo config now owns the Apple entitlement,
no-tracking App Privacy manifest, required-reason API declarations, Android
permission removals, and disabled Android backup. The offline Apple/Google
answer matrices and deletion URLs are in
`docs/operations/m4-t7-store-compliance.md`.

Apple Developer/Play Console access, final identifiers, Clerk/Apple console
configuration, store-form entry, a real successful Apple session, and internal
build distribution were not performed. They are M4-T8 gates, so the M4 exit
remains blocked. The development-plan Next Action is M4-T8.

## Commands

Run from the repository root:

```bash
pnpm --filter @chinasupply/mobile start
pnpm mobile:check
pnpm test:mobile:e2e -- --udid=<device-id>
pnpm mobile:eas:preview -- --non-interactive --wait
```

`pnpm mobile:check` runs Expo Doctor, TypeScript, Expo public configuration,
and iOS/Android export-bundle checks. Native Preview builds are submitted from
this package directory by the root wrapper, so Expo discovers the monorepo root
and installs the pnpm workspace without a non-existent `workingDirectory`
property or custom Metro `watchFolders`.

`test:mobile:e2e` requires the external `maestro` CLI and does not add Maestro
to the App runtime. Install the current staging build on the selected simulator
or emulator first and supply its exact UDID. iOS Simulator builds must be
locally signed so Clerk's encrypted token cache can use Keychain; an unsigned
`CODE_SIGNING_ALLOWED=NO` build is not a valid authentication test artifact.
The flow uses canonical staging plus Clerk's documented test-email suffix and
OTP. `.maestro-artifacts/` is ignored and must be deleted after each run; never
commit or retain generated emails, tokens, screenshots, or raw Maestro logs.
Only close the gate after Clerk absence, core tombstones, zero favorites, and
successful delete webhooks have been confirmed through read-only checks.

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

# M4-T5 Navigation Release Validation

> Task: M4-T5 / PRD G-1, G-2, F-6.3, F-6.4, N-5
>
> Status: **Complete; F-6.4 accepted by Owner**
>
> Date opened: 2026-07-29
>
> Date closed: 2026-07-29

## Closure attestation

On 2026-07-29 the Owner explicitly confirmed that they completed the full
13-row Release physical-device matrix below, that each provider opened a
destination-filled route-planning or approved equivalent Web view, and that
every observed destination error was `<50m`. The Owner also explicitly directed
that M4-T5 be checked. This statement is the acceptance evidence recorded by
the repository.

The Owner did not supply the per-device model/OS, Release artifact identifier,
map-App version, measured distance, or external evidence reference for
transcription in this closeout. Those fields are therefore marked as
Owner-verified but not transcribed instead of being inferred or fabricated.

## Frozen contract

- Mobile consumes the M0-T9-approved `buildNavUrl` templates without changing
  their providers, coordinate mode, or route-planning behavior.
- A-5 supplies WGS-84 GeoJSON coordinates in `[longitude, latitude]` order.
- iOS exposes Google Maps, Apple Maps, Amap, and Baidu Maps. Android exposes
  Google Maps, Amap, and Baidu Maps.
- Google and Apple use one HTTPS handoff. Amap and Baidu try the approved App
  URI first and open the approved Web URL only when the native handoff rejects.
- A click sends one consent-aware `navigation_clicked` facade call containing
  only factory identity, provider, and platform. Mobile still has no PostHog
  adapter or granted analytics consent, so this remains a network no-op.

The implementation deliberately does not call `Linking.canOpenURL`. It
therefore does not add iOS query schemes or Android package-visibility queries;
the actual `Linking.openURL` rejection is the fallback signal.

## Automated evidence

- Provider/platform sets and ordering are fixed by Mobile unit tests.
- Mobile tests cover WGS-84 order, platform-specific templates, one-shot HTTPS
  handoff, App URI success, Web fallback, double failure, recoverable UI, and
  one coordinate-free analytics call per press.
- The existing `packages/geo` fixtures remain the exact URL-template source of
  truth; this task does not duplicate or modify those mappings.

Final command results and the delivered commit/PR are recorded in
`开发日志.md`. Automated evidence cannot satisfy F-6.4.

## Local Preview smoke (not F-6.4 evidence)

On 2026-07-29 the canonical staging A-5 response for
`dongguan-oppo-mobile` was re-read before testing. It remained published to the
App, verified at `2026-07-25T11:36:26.386Z`, and returned
`[113.7771621452, 22.7707857278]`.

| Platform | Local artifact and runtime                                                                                    | Observed result                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | `ChinaSupplyAIStaging`, local unsigned Release Simulator build; iPhone 17 Pro / iOS 26.5; Preview environment | A-5 rendered Google, Apple, Amap, and Baidu as accessible links. Apple Maps accepted the HTTPS handoff and entered route planning. With Amap absent, the App URI rejection immediately opened `amap.com` in Safari with the OPPO destination filled. Returning to ChinaSupply.AI did not crash.                                                                                                       |
| Android  | Local Release `app-release.apk`; `diaoyouji_api_36` / API 36; Preview environment                             | A-5 rendered Google, Amap, and Baidu with no Apple link. Installed Google Maps opened route planning with destination `22.7707860,113.7771620`. With Amap absent, ActivityManager recorded `amapuri://route` rejected (`-91`) followed by `https://uri.amap.com` accepted by Chrome (`0`). Returning to ChinaSupply.AI left the error region empty and logcat contained no App fatal/unhandled error. |

Chrome on the fresh Emulator stopped at its first-run terms screen. No terms
were accepted for this smoke, so Android Web page rendering was not claimed;
the OS-level fallback handoff was still directly observed, while the complete
URL and page behavior remain covered by the fixed tests and the iOS Safari
smoke. A true double handoff rejection is deterministic only in the launcher
unit/UI tests because the simulators accept HTTPS even while offline.

These local builds prove platform isolation, staging integration, handoff, and
return-without-crash behavior only. They are not the reviewed physical-device
Release artifacts and contain no landing-error measurement, so they do not
close any row below.

## Release artifacts

| Platform | Required package                              | Artifact/build                     | Implementation commit | Status                |
| -------- | --------------------------------------------- | ---------------------------------- | --------------------- | --------------------- |
| iOS      | Staging Release build installed without Metro | Owner-verified; ID not transcribed | `61d298b`             | Pass (Owner attested) |
| Android  | EAS Preview Release APK                       | Owner-verified; ID not transcribed | `61d298b`             | Pass (Owner attested) |

Production Build/Submit, store tracks, production credentials, and production
MapTiler keys are outside M4-T5 and must not be used for this gate.

## Representative factory

The approved default is the published staging factory
`dongguan-oppo-mobile` (OPPO Guangdong Mobile Telecommunications Co., Ltd.).
Its independently reviewed entrance is `OPPO广东移动通信有限公司(1号门)` and
its canonical WGS-84 position is
`[113.7771621452, 22.7707857278]`. Before testing, reload A-5 and confirm the
factory remains published and returns that same reviewed coordinate; do not
modify canonical data to make the test pass.

## Installed-App matrix

Each row must record the device/OS, map App version, observed destination,
measured error, reviewer/date, and evidence reference. Passing means the App
opens a destination-filled route-planning view without forcing live navigation
and the destination error is `<50m`.

| ID         | Platform | Provider    | App version                     | Route planning | Error                   | Evidence                      | Result                |
| ---------- | -------- | ----------- | ------------------------------- | -------------- | ----------------------- | ----------------------------- | --------------------- |
| IOS-APPLE  | iOS      | Apple Maps  | Owner-verified; not transcribed | Pass           | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| IOS-GOOGLE | iOS      | Google Maps | Owner-verified; not transcribed | Pass           | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| IOS-AMAP   | iOS      | Amap        | Owner-verified; not transcribed | Pass           | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| IOS-BAIDU  | iOS      | Baidu Maps  | Owner-verified; not transcribed | Pass           | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| AND-GOOGLE | Android  | Google Maps | Owner-verified; not transcribed | Pass           | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| AND-AMAP   | Android  | Amap        | Owner-verified; not transcribed | Pass           | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| AND-BAIDU  | Android  | Baidu Maps  | Owner-verified; not transcribed | Pass           | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |

## Web-fallback matrix

Use dedicated test devices or obtain explicit approval before removing or
disabling an installed third-party map App. Restore any changed device state
afterward. Apple Maps has no separate removal case because its approved HTTPS
URL is both the primary and fallback.

| ID            | Platform | Provider unavailable | Web destination correct | Can continue planning | Error                   | Evidence                      | Result                |
| ------------- | -------- | -------------------- | ----------------------- | --------------------- | ----------------------- | ----------------------------- | --------------------- |
| FB-IOS-GOOGLE | iOS      | Google Maps          | Pass                    | Pass                  | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| FB-IOS-AMAP   | iOS      | Amap                 | Pass                    | Pass                  | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| FB-IOS-BAIDU  | iOS      | Baidu Maps           | Pass                    | Pass                  | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| FB-AND-GOOGLE | Android  | Google Maps          | Pass                    | Pass                  | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| FB-AND-AMAP   | Android  | Amap                 | Pass                    | Pass                  | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |
| FB-AND-BAIDU  | Android  | Baidu Maps           | Pass                    | Pass                  | `<50m` (Owner attested) | Owner attestation, 2026-07-29 | Pass (Owner attested) |

For Baidu, the approved Web result is the official marker page with the
correct destination and a usable “到这去/导航” continuation.

## Closure

The Owner's 2026-07-29 attestation closes all 13 rows with every destination
error `<50m`. M4-T5 is checked, its closeout is delivered as a separate PR
after the implementation PR, and the development-plan Next Action is M4-T6.
The missing raw device/build/App-version details remain an evidence-recording
limitation; they are not treated as an unfinished product gate after the
Owner's explicit acceptance.

# M4-T7 store compliance package

> Status: **Offline package complete; store-side work blocked on M4-T8**
>
> Last verified: 2026-07-29
>
> Scope: PRD F-8.1, F-11.1, and F-11.4. This file is the offline source for App Store Connect App Privacy and Google Play Data Safety entry. It is not evidence that either control panel was submitted.

## Acceptance boundary

The Owner approved M4-T7 as an offline compliance deliverable. The repository now contains the native privacy declarations, Android permission policy, legal entry points, Sign in with Apple implementation, environment guard, and store-answer matrices. The following external actions remain mandatory in M4-T8 and are **not complete**:

- enroll in and access Apple Developer Program and Google Play Console;
- reserve and confirm the production iOS Bundle ID and Android package name;
- enable the Apple Sign in capability, create the Clerk Native Application, configure the Clerk Apple connection, and confirm production callback/identifier settings;
- enter and submit App Privacy, Data Safety, and account-deletion answers in the store consoles;
- complete a real successful Apple login and existing return-path flow on iOS;
- create and distribute TestFlight and Google Play internal-test builds.

M0-T0, M4-T8, and the M4 exit therefore remain unchecked. Production submission in M5-T10 must compare the final binary with these answers again.

## Runtime and native controls

- iOS uses Clerk's native `useSignInWithApple` flow. A successful session is activated through Clerk and runs the existing auth completion callback. User cancellation is silent; other failures use a localized generic message.
- `EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED=true|false` gates the social-auth offer. On iOS, Apple and Google are either both visible or both hidden. Android retains Google regardless of this flag. Production environment validation rejects any value other than `true`.
- `ios.usesAppleSignIn` and the `expo-apple-authentication` plugin generate the Apple entitlement. The checked-in Expo config declares `NSPrivacyTracking=false` and the collected-data matrix below.
- Required-reason API declarations were taken from the Expo/native dependency aggregate and confirmed again after prebuild: File Timestamp (`C617.1`, `0A2A.1`, `3B52.1`), User Defaults (`CA92.1`), Disk Space (`E174.1`, `85F4.1`), and System Boot Time (`35F9.1`). M5-T10 must regenerate and compare the aggregate after the final dependency/build lock.
- Android sets `android:allowBackup="false"`. Manifest merger removal rules block `MANAGE_EXTERNAL_STORAGE`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, and `VIBRATE`; `android.permission.INTERNET` remains.
- Mobile does not add PostHog, advertising SDKs, ATT, location permission, contacts access, payment, or a new business API/schema in M4-T7.

## Legal entry points and deletion

The App uses `expo-web-browser` for an in-app browser handoff and shows a localized Retry action if opening fails.

| Environment     | Privacy Policy                           | Terms of Use                           | Web deletion request                                                    |
| --------------- | ---------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Local / Staging | `https://staging.chinasupply.ai/privacy` | `https://staging.chinasupply.ai/terms` | `https://staging.chinasupply.ai/privacy#retention-and-account-deletion` |
| Production      | `https://www.chinasupply.ai/privacy`     | `https://www.chinasupply.ai/terms`     | `https://www.chinasupply.ai/privacy#retention-and-account-deletion`     |

The registration surface retains the approved notice beginning “By creating an account…” with direct Privacy Policy and Terms of Use links. The Account tab exposes both links before login and in a dedicated Legal card after login.

In-App deletion path: **Account → Delete account → Delete account confirmation**. This invokes the existing A-10 flow, removes the Clerk user, tombstones the core user through the verified webhook path, hard-deletes favorites, clears the local session/cache, and returns to the public Map. The public Web deletion URL above is the off-App deletion-request path required for Google Play.

## Apple App Privacy answers

Set **Data Used to Track You: No**. Do not enter tracking domains. Use the following data types and purposes; all are **not tracking**.

| Apple data type                                             | Collected | Linked to identity | Purpose           |
| ----------------------------------------------------------- | --------- | ------------------ | ----------------- |
| Contact Info → Name                                         | Yes       | Yes                | App Functionality |
| Contact Info → Email Address                                | Yes       | Yes                | App Functionality |
| Identifiers → User ID                                       | Yes       | Yes                | App Functionality |
| Usage Data → Search History                                 | Yes       | No                 | App Functionality |
| Usage Data → Product Interaction (saved factories/clusters) | Yes       | Yes                | App Functionality |
| Diagnostics → Crash Data                                    | Yes       | No                 | App Functionality |
| Diagnostics → Performance Data                              | Yes       | No                 | App Functionality |
| Diagnostics → Other Diagnostic Data                         | Yes       | No                 | App Functionality |

Do not declare advertising, third-party advertising, developer advertising/marketing, cross-app tracking, precise/coarse location, contacts, payment/financial information, health, sensitive information, photos/videos, audio, browsing history, or user content for the current V1 binary.

## Google Play Data Safety answers

Top-level answers:

- the app collects the data listed below;
- data is encrypted in transit;
- data is not sold;
- the public map/search experience is usable without an account, so account fields and saved-item interactions are optional collection from the user's perspective;
- users can request deletion in-App and at the Web deletion URL above;
- Clerk and Sentry processing performed only as contracted service providers is entered as **not shared** under Google's service-provider exception. Re-evaluate this answer if contracts, SDK purpose, or onward use changes.

| Google category / type                                     | Collected | Optional | Shared | Purpose                               |
| ---------------------------------------------------------- | --------- | -------- | ------ | ------------------------------------- |
| Personal info → Name                                       | Yes       | Yes      | No     | App functionality; Account management |
| Personal info → Email address                              | Yes       | Yes      | No     | App functionality; Account management |
| Device or other IDs → User IDs                             | Yes       | Yes      | No     | App functionality; Account management |
| App activity → App interactions (saved factories/clusters) | Yes       | Yes      | No     | App functionality                     |
| App activity → In-app search history                       | Yes       | Yes      | No     | App functionality                     |
| App info and performance → Crash logs                      | Yes       | No       | No     | App functionality                     |
| App info and performance → Diagnostics                     | Yes       | No       | No     | App functionality                     |

Do not select location, financial information, contacts, messages, photos/videos, audio files, files/documents, health/fitness, calendar, Web browsing, installed apps, or advertising/personalization for the current V1 binary.

## Verification evidence

The code-level acceptance suite covers Apple success/cancel/failure/session activation/completion callback, platform-specific provider visibility, canonical legal URL resolution, in-app browser success/failure/Retry, the Production Apple flag guard, Apple entitlement/privacy declarations, Android backup, and blocked permissions.

Expo introspection and a non-clean native prebuild on 2026-07-29 confirmed:

- `com.apple.developer.applesignin = [Default]`;
- the public iOS config contains `NSPrivacyTracking=false`, all eight collected types, and all four required-reason API categories;
- Android has `android:allowBackup=false`;
- the generated iOS entitlement and `PrivacyInfo.xcprivacy` preserve those same values;
- the Android release manifest preserves `INTERNET`, contains none of the five blocked permissions, and has `android:allowBackup=false`.

An iOS 26.5 Simulator Release build and an Android API 36 Emulator release APK both opened the canonical staging Privacy Policy and Terms of Use before and after email login. The flows showed no application permission prompt and deleted their temporary Clerk accounts on completion. Android exposed Google but no Apple button. Because the Apple flag is intentionally disabled until M4-T8 configuration, no real Apple identity or successful Apple session was tested.

The staging Privacy Policy and Terms of Use remain the Owner-approved M3-T7 pages. No store control panel, production identifier, production build, or real Apple identity was used to produce this evidence.

## Authoritative references

- [Apple App Review Guidelines, section 4.8](https://developer.apple.com/app-store/review/guidelines/)
- [Clerk Expo: Sign in with Apple](https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-apple)
- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Expo Apple privacy manifests](https://docs.expo.dev/guides/apple-privacy/)
- [Expo permissions](https://docs.expo.dev/guides/permissions/)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

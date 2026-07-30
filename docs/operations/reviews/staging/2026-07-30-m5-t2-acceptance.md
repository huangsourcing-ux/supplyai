# M5-T2 canonical staging acceptance

Status: pending one authorized browser-upload source.

## Release under review

- Implementation PR: #86
- Exact merged and deployed commit: `5bebce485bb96a4a924f66dbd495d2bf102c225b`
- Canonical Web origin: `https://staging.chinasupply.ai`
- Canonical API origin: `https://api-staging.chinasupply.ai/api/v1`
- Acceptance branch: `codex/m5-t2-staging-acceptance`

The merged commit passed the repository CI, API e2e, Web Playwright, build,
CMS/Core staging migrations, staging release gate, and Vercel deployment before
the canonical checks below began.

## `/ops` browser checks

An authenticated Clerk admin used the canonical `/ops` UI. No SQL, seed,
import, temporary write script, synthetic entity, or production environment was
used.

- The existing 10-cluster and 50-factory lists loaded, and both draft create
  forms were available.
- A new-factory form kept media controls disabled before a server ID existed.
- Map click produced longitude `116.2859970` and latitude `40.1905148`; manual
  entry of `[120.0647724, 29.3099610]` moved the pin back to the entered WGS-84
  position. Both values retained seven decimal places.
- The map showed MapTiler and OpenStreetMap attribution. Numeric fields remained
  usable independently of the map.
- The existing Jinkanghong image rendered from the Admin CDN preview and exposed
  bilingual alt, ordering, detach, and upload controls.
- The browser console contained no application error during these checks.

No create form was submitted, so this acceptance added no entity that V1 could
not delete.

## Independent SOP decision and canonical writes

On 2026-07-30, the Owner explicitly stated that they had independently completed
the full Jinkanghong and Yayu data-verification SOP; Phone, Email, WeChat,
manufacturing identity, and product evidence all passed, and the records were
approved for save, verify, and rule-compliant publish.

The official sources were re-opened at 2026-07-30 02:48 EDT:

- Jinkanghong contact page:
  `https://en.kifro.com/contacts.html?isPreview=true`
- Yayu contact page: `https://ywyayu.com/contact/7`
- Yayu company profile: `https://ywyayu.com/aboutus.aspx?classid=15`

Only after that approval, `/ops` performed these writes:

| Factory                               | `/ops` values                                                      | State transition                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Jinkanghong (`7xkIy5So-yz4eUZodAVMj`) | source URL, `max.jkh@kifro.com`, `+86-15262853575`                 | profile save reset verification; reviewer acknowledgement followed by Verify restored `published + verified`   |
| Yayu (`CmGe2vHCEqbxXlmuI9u1P`)        | source URL, `yayuexport@163.com`, `+86 17280940617`, `yayutextile` | Save kept `draft + unverified`; reviewer acknowledgement, Verify, then Publish produced `published + verified` |

Fresh anonymous A-5 responses returned both records as verified and exposed the
approved contact fields. The Jinkanghong public response retained its CDN image
and did not expose an object key; Yayu correctly had no image.

The canonical real-seed file now carries the same approved contacts and contact
source URLs. Its regression test treats these two exact slug/value objects as a
closed reviewed set; every other factory remains restricted to its official
website only. This replaces the M1-T8 initial blanket without allowing arbitrary
unreviewed contacts and does not change an API or import schema.

## Browser media upload

Pending. The Owner requested an image be generated, but a synthetic image cannot
satisfy the approved requirement for a real authorized source and is not used as
acceptance evidence. Complete this section only after the Owner either attaches
the authorized source again or explicitly authorizes reuse of the existing
M5-T1 source image for a new canonical `/ops` browser upload.

The completed record must include source authorization, MIME type, byte count,
SHA-256, the new object key (never the presigned URL), presign/PUT/PATCH/HEAD
results, `/ops` preview, and A-5/CDN equality.

## Mobile media and contact rerun

### iOS

- App: previously installed `ai.chinasupply.app.staging`
- Device: iPhone 17 Pro Simulator, iOS 26.5
- Jinkanghong detail displayed the one CDN image, Phone, and Email.
- Yayu detail displayed Phone, Email, and WeChat. Copy produced the visible
  `WeChat ID copied` state, and `simctl pbpaste` returned exactly `yayutextile`.
- Phone taps dispatched `tel:+8615262853575` and `tel:+8617280940617` to iOS
  LaunchServices. The Simulator has no telephone URL handler, so LaunchServices
  returned error 115 after receiving each exact URL. This proves the App-to-OS
  handoff value but is not represented as a physical-device call UI success.

### Android

- App: `ai.chinasupply.app.staging`
- Device: `diaoyouji_api_36`, Android 16 / API 36 Emulator
- Jinkanghong detail displayed its CDN image, Phone, and Email.
- Yayu detail displayed Phone, Email, and WeChat; the Copy action produced the
  visible `WeChat ID copied` state.
- Google Dialer opened from the staging App with
  `Intent { act=android.intent.action.VIEW dat=tel:+8615262853575 }` and visibly
  displayed `+86 152 6285 3575`.
- Google Dialer opened from the staging App with
  `Intent { act=android.intent.action.VIEW dat=tel:+8617280940617 }` and visibly
  displayed `+86 172 8094 0617`.

## Closure decision

Do not check M5-T2 yet. The real canonical browser upload remains the only open
acceptance gate. No production operation was performed.

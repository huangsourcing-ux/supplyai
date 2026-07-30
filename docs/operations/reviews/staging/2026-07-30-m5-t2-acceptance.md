# M5-T2 canonical staging acceptance

Status: pending completion of the canonical browser upload.

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

On 2026-07-30 the Owner revised the project rule so display, marketing,
placeholder, and editorial images default to direct AI generation. Generated
images must be labeled as illustrative and cannot serve as evidence of a real
facility, manufacturing capability, product, identity, qualification, or SOP
fact. M5-T2 therefore uses the independently approved official pages for factual
review and the following generated asset only for gallery presentation:

- Classification: Owner-approved AI-generated illustration; not documentary
  evidence
- Intended alt (English): `AI-generated illustration of home textile production`
- Intended alt (Chinese): `AI 生成的家纺生产展示插图`
- Format and dimensions: PNG, 1448 × 1086, RGB
- Byte count: `2697397`
- Source SHA-256:
  `bb93082788c74adf638a39505a2c788625178f455e436039dc092a5bf2614504`
- Prompt constraints: modern home-textile production; no specific real facility,
  brand, logo, text, flag, watermark, or identifiable real person

Pending browser reconnection: record the new object key (never the presigned
URL), presign/PUT/PATCH/HEAD results, `/ops` preview, and A-5/CDN equality after
the canonical upload succeeds.

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

Do not check M5-T2 yet. The canonical browser upload remains the only open
acceptance gate. No production operation was performed.

# M5-T2 `/ops` enhancements and staging acceptance

Status: implementation complete; canonical staging acceptance has one remaining
authorized browser-upload gate.

## Implemented scope

The restricted Web `/ops` dashboard now supports:

- creating draft industrial clusters and draft, unverified factories with the existing ADM-1 and ADM-3 generated client methods;
- selecting a WGS-84 point by clicking or dragging a MapLibre pin, with `[longitude, latitude]` fields kept available when the map cannot load;
- uploading, replacing, and detaching a cluster cover reference;
- uploading factory images one at a time, editing bilingual alt text, moving references up or down, and detaching references;
- validating JPEG, PNG, and WebP files from 1 byte through 10 MB before ADM-6 presign;
- performing the cross-origin R2 PUT with `credentials: "omit"` and only the presign response's `Content-Type` header;
- retaining an uploaded `objectKey` when the subsequent PATCH fails, so Retry repeats only the reference PATCH.

Detaching media only clears the database reference. V1 has no R2 deletion contract, so `/ops` does not delete the underlying object. Factory profile or image PATCH operations reset verification and the UI explicitly requires a new SOP review.

This implementation does not change public APIs, Zod schemas, OpenAPI, generated clients, database schema, Payload collections, Mobile code, or R2 CORS configuration.

## Canonical staging gate

M5-T2 remains incomplete until the implementation PR is merged and deployed to canonical staging. The acceptance must then be recorded in a separate PR created from the resulting `main`.

The acceptance PR must record all of the following without using SQL, seed data, fixtures, or temporary scripts:

1. The Owner supplies the previously authorized Jinkanghong image again, or another authorized image of the same subject. A real browser on the canonical staging origin completes presign → PUT → PATCH/HEAD → `/ops` preview → A-5/CDN.
2. Jinkanghong Phone `+86-15262853575` and Email `max.jkh@kifro.com` are independently checked against its official contact page and pass the data-verification SOP.
3. Yayu Phone `+86 17280940617`, Email `yayuexport@163.com`, WeChat `yayutextile`, manufacturing evidence, and every other applicable SOP item are independently checked. Any failed item leaves Yayu draft and unverified and blocks M5-T2 closure.
4. Only after the Owner explicitly confirms the independent review may `/ops` save, verify, or publish the reviewed records.
5. The canonical source ledger, real-seed contacts, and staging review record are synchronized with the approved writes.
6. iOS and Android rerun the M4-T2c media/contact path. The system dialers receive `tel:+8615262853575` for Jinkanghong and `tel:+8617280940617` for Yayu; Yayu WeChat is copyable.

No production operation, synthetic staging entity, or M5-T2 completion checkbox is authorized by this implementation PR.

## Acceptance progress

Implementation PR #86 was merged as
`5bebce485bb96a4a924f66dbd495d2bf102c225b` and deployed to canonical staging.
The authenticated `/ops` create/map/media controls, Owner-approved SOP writes,
anonymous A-5 responses, and iOS/Android media/contact rerun are recorded in
[`2026-07-30-m5-t2-acceptance.md`](reviews/staging/2026-07-30-m5-t2-acceptance.md).

Jinkanghong and Yayu are now `published + verified` with the approved contacts.
M5-T2 remains unchecked only because a synthetic generated image is not valid
evidence for the required real browser upload. The Owner must attach the
authorized source again or explicitly authorize reuse of the existing M5-T1
source before the acceptance PR can close.

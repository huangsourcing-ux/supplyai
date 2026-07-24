# Cloudflare and MapTiler staging operations

This runbook is the M0-T10 contract. It contains resource names and restrictions
only; secret and key values must remain in provider-managed encrypted stores.
Production resources are not created until M5-T9.

## Resource inventory

| Boundary           | Staging resource                     | Contract                                                                                |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------------------- |
| API edge           | `api-staging.chinasupply.ai`         | Proxied Cloudflare CNAME to Railway port 3001; SSL mode `Full`                          |
| Railway origin     | `api-production-05a7.up.railway.app` | Direct `/health/live` and `/health/ready` only; all other paths require the edge secret |
| Public media       | `chinasupply-staging-media`          | Custom domain `cdn-staging.chinasupply.ai`; `r2.dev` disabled                           |
| Private operations | `chinasupply-staging`                | No custom domain, no CORS, `r2.dev` disabled                                            |
| Web map key        | `chinasupply-web-staging`            | Allowed HTTP origin `staging.chinasupply.ai`                                            |
| iOS map key        | `chinasupply-ios-staging`            | Allowed User-Agent substring `ChinaSupplyAI-iOS/ai.chinasupply.app.staging`             |
| Android map key    | `chinasupply-android-staging`        | Allowed User-Agent substring `ChinaSupplyAI-Android/ai.chinasupply.app.staging`         |

Railway created the custom-domain claim for `api-staging.chinasupply.ai` on
2026-07-23. Its DNS target and verification TXT must be read from
`railway domain status api-staging.chinasupply.ai --service api --json` rather
than copied from this document.

## Trusted edge

The Cloudflare request-header Transform Rule must match only:

```text
http.host eq "api-staging.chinasupply.ai"
```

It overwrites `X-ChinaSupply-Edge-Token` with a cryptographically random
32-byte value. Store the same value only as Railway API
`EDGE_PROXY_SECRET`. Do not add it to Worker, Vercel, EAS, GitHub, source,
logs, fixtures, or this runbook.

The API does not trust `X-Forwarded-For`. After constant-time edge-secret
validation it accepts exactly one syntactically valid `CF-Connecting-IP` value
and exposes it as `FastifyRequest.clientIp` for M1-T6. Missing/incorrect edge
credentials return `FORBIDDEN`; malformed trusted-edge metadata returns a
sanitized `INTERNAL` envelope.

When enabling the hostname:

1. Add Railway's verification TXT unchanged.
2. Add the Railway CNAME target as a proxied DNS record.
3. Set Cloudflare SSL/TLS mode to `Full` as required by Railway.
4. Create the hostname-scoped Transform Rule and set Railway
   `EDGE_PROXY_SECRET` before deploying the protected API code.
5. Keep the Railway service hostname for health checks and rollback only.

## R2 isolation and CORS

The committed staging media policy is
`infra/cloudflare/r2-cors.staging.json`. Its only allowed origin is
`https://staging.chinasupply.ai`; methods are `GET`, `HEAD`, and `PUT`; the
only allowed request header is `Content-Type`; `ETag` is exposed; preflight
TTL is 3600 seconds. CORS does not validate media type, object size, ownership,
or environment.

Environment variables:

| Consumer    | Variables and access                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Web/Payload | `R2_MEDIA_BUCKET`, `R2_PREFIX`, `R2_CDN_BASE_URL`; credential limited to media-bucket Object Read/Write                              |
| API/Worker  | `R2_MEDIA_BUCKET`, `R2_PRIVATE_BUCKET`, `R2_PREFIX`, `R2_CDN_BASE_URL`; credential limited to both staging buckets Object Read/Write |

Staging uses `R2_PREFIX=staging`. The production pair uses an empty prefix and
separate credentials; it is not created in M0-T10.

## Purge token

`CLOUDFLARE_PURGE_TOKEN` is stored only in Railway and grants only `Cache
Purge` for the `chinasupply.ai` zone. Verify it with Cloudflare's token verify
endpoint and inspect the zone-scoped permission. Do not perform a purge in
M0-T10; URL purge integration belongs to M5-T3.

Rotation:

1. Create and verify the replacement token.
2. Replace the encrypted Railway variable.
3. Redeploy and run a non-mutating token verification.
4. Revoke the old token.

The edge secret uses the same create → dual-write → deploy/smoke → revoke
sequence, with the dual write limited to the Transform Rule and Railway API.

## MapTiler request identity

Web sends its key through the existing public Web configuration and relies on
the exact staging origin restriction. Mobile keeps two keys:
`EXPO_PUBLIC_MAPTILER_IOS_KEY` and
`EXPO_PUBLIC_MAPTILER_ANDROID_KEY`. MapLibre's
`TransformRequestManager` adds the matching platform User-Agent only for
`https://api.maptiler.com/`; the string is derived from the canonical Expo
Bundle ID or Android package.

If the current MapTiler plan cannot create all three protected keys, leave
M0-T10 incomplete and obtain the required plan. Never use an unrestricted
default key or one key across platforms.

## Acceptance smoke

- Cloudflare API hostname: response has `CF-Ray`; `/health/edge` is `no-store`
  and matches the tester's public IPv4/IPv6; direct Railway `/health/edge`
  returns the standard 403 envelope while live/ready remain healthy.
- R2: allowed-origin PUT preflight succeeds; a different origin gets no allow
  headers; a temporary media object is readable from the CDN; the private
  bucket has no public route. Delete the temporary object afterward.
- MapTiler: each key succeeds only with its documented origin/User-Agent and
  fails with missing or incorrect restriction values.
- Purge: token verification succeeds; no purge request is sent.

## Rollback

If edge routing fails, keep `/health/live` and `/health/ready` available,
disable the proxied API DNS record, and roll Railway back to the last version
that predates the edge-secret requirement. Do not expose business routes by
weakening the secret check. Disconnecting the media custom domain removes
public access without affecting the private bucket; `r2.dev` remains disabled.

## Current external status (2026-07-23)

- The active `chinasupply.ai` zone and both live staging buckets are in account
  `56d1a468b0a9e0095832fc44609dc25f`. Cloudflare SSL mode is `Full`.
  `api-staging.chinasupply.ai` is a proxied CNAME with Railway's verification
  TXT; Railway reports the custom domain and certificate active on port 3001.
- The hostname-scoped Transform Rule `ChinaSupply staging API trusted edge`
  overwrites `X-ChinaSupply-Edge-Token`. The matching encrypted
  `EDGE_PROXY_SECRET` exists only on Railway API. The deployed API and Worker
  releases are healthy.
- `chinasupply-staging-media` has the exact committed CORS policy and active
  custom domain `cdn-staging.chinasupply.ai` with TLS 1.2 minimum.
  `chinasupply-staging` remains private with no CORS or custom domain. Both
  buckets have `r2.dev` disabled.
- R2 token `chinasupply-web-staging-media` grants Object Read/Write only on the
  media bucket and is stored in Vercel. Token
  `chinasupply-api-worker-staging` grants Object Read/Write only on the two
  staging buckets and is stored in Railway API/Worker. No production bucket or
  credential was created.
- User token `chinasupply-staging-cache-purge` grants only zone-scoped Cache
  Purge for `chinasupply.ai`; Cloudflare token verification reports it active.
  It is encrypted in Railway API/Worker. No purge request was sent.
- MapTiler keys `chinasupply-web-staging`, `chinasupply-ios-staging`, and
  `chinasupply-android-staging` use the restrictions in the inventory. The Web
  key is encrypted in Vercel Production/Preview targets; the two Mobile keys
  are encrypted in the EAS Preview environment.
- External smoke passed: Cloudflare live/ready/edge returned 200 with
  `CF-Ray`; edge was `no-store`, matched the tester's public IP, and rejected a
  forged client-IP header. Direct Railway live/ready returned 200 while edge
  and a business path returned the standard 403 `FORBIDDEN` envelope. R2
  allowed-origin preflight returned 204, a foreign origin returned 403, a
  temporary media object was readable from the CDN, and the private object had
  no public route; both test objects were deleted. Each MapTiler key returned
  200 only for its documented Origin/User-Agent and 403 when missing or wrong.
- Earlier same-named buckets in account
  `0431bd1fc2c8927a1433f273bf43bf5a` are unused legacy resources. They are not
  referenced by staging and were not deleted because cleanup is outside this
  task's live-resource scope.

## Provider references

- [Cloudflare HTTP request headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
- [R2 public buckets and custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare Purge API](https://developers.cloudflare.com/api/resources/cache/methods/purge/)
- [MapTiler key protection](https://docs.maptiler.com/guides/maps-apis/maps-platform/how-to-protect-your-map-key/)

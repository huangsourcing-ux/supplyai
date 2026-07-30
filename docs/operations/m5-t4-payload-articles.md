# M5-T4 Payload articles and Guides acceptance

> Status: canonical staging acceptance complete
>
> Scope: G-2/G-9/G-10, F-7.1, F-10.2, and N-2

## Frozen implementation behavior

- Payload owns only `cms_users`, `media`, `articles`, `_articles_v`, and its
  internal tables/relations. It never creates a relationship or foreign key to
  core `clusters`.
- Media uploads use the Payload Admin's authenticated, same-origin five-minute
  presign route. The server selects
  `(<environment-prefix>/)articles/media-<21-character-nanoid>.<ext>`; only
  JPEG, PNG, or WebP from 1 byte through 10 MB are signed. The direct R2 PUT
  sends no Payload cookie, multipart body, or server credential.
- Media creation and Article publication both perform R2 HEAD validation for
  environment ownership, existence, MIME, MIME-derived extension, and exact
  byte count. Referenced media cannot be deleted.
- Articles use English-only unique slugs, required covers, Lexical text/links
  plus Cluster Card, draft/version workflow, and a write-once `publishedAt`.
  Cluster Card stores only the 21-character core cluster ID. Publication
  rejects any ID absent from public MAP-1.
- `/guides` and `/guides/[slug]` use Payload Local API with explicit
  `published + en` filters. The detail page requests public MAP-1 at most once;
  an unpublished cluster or temporary MAP failure renders a localized
  unavailable card without exposing draft data or failing the article.

## Deployment prerequisite

Do not execute canonical acceptance from this implementation branch or a
Preview deployment. Merge the implementation PR, then require the exact main
commit to pass CI Gate, CMS migration, Core migration, Staging Release Gate,
and the Vercel canonical staging deployment. Confirm the specified Dongguan
cluster ID `TjP3dEJaEU1TNHt9EBCsZ` is still returned by anonymous MAP-1. If it
is not published, stop and record the blocker; do not substitute another
cluster.

Never record a Payload cookie, complete presigned URL, R2 credential, or other
secret. The presigned URL is a bearer token until it expires.

## Canonical staging checklist

- [x] Record implementation PR, exact merged main commit, CI run, CMS/Core
      migration result, Staging Release Gate, and exact-commit Vercel
      deployment.
- [x] Use built-in image generation to create a landscape editorial
      illustration with no brand, text, identifiable real person, or factual
      real-facility implication. Record source MIME, dimensions, byte count,
      and SHA-256 outside the repository asset tree.
- [x] In canonical Payload Admin request the client upload URL, perform the
      credential-free PUT, create Media, and confirm server HEAD succeeds. Alt
      must be exactly `AI-generated illustration of a buyer exploring industrial clusters on a digital map`; enable `aiGenerated`.
- [x] Publish `How to Explore an Industrial Cluster on ChinaSupply.AI` at slug
      `how-to-explore-an-industrial-cluster`, locale `en`, with a Dongguan
      Cluster Card storing only `TjP3dEJaEU1TNHt9EBCsZ`.
- [x] Confirm `/guides` is reverse-published order and the detail returns SSR
      HTML containing the title, visible `AI-generated illustration`, Dongguan
      name/factory count, and `/clusters/dongguan-electronic-information` link.
- [x] Confirm canonical, English hreflang, description, article Open Graph,
      `publishedTime`, cover URL, and cover alt in returned metadata.
- [x] Confirm anonymous Payload REST requests for `articles` and `media` are
      rejected and public pages still render through strict Local API reads.
- [x] Compare generated source and CDN GET MIME, byte count, and SHA-256; HEAD
      must report the same MIME and length. Record objectKey but no signed URL.
- [x] Submit non-sensitive evidence on
      `codex/m5-t4-staging-acceptance`, append the closeout log, check M5-T4,
      and advance Next Action to M5-T5. Do not migrate the article to
      production.

## Implementation-phase result

The implementation branch includes the frozen v1.6/v1.7 document update,
Payload models and generated artifacts, explicit CMS migration, R2 upload
chain, `/guides` pages, Cluster Card picker/rendering, tests, and this acceptance
runbook. Local migration execution succeeded.

## Canonical staging result

- Delivery merged through implementation PR
  [#89](https://github.com/huangsourcing-ux/supplyai/pull/89) and narrowly
  scoped compatibility fixes
  [#90](https://github.com/huangsourcing-ux/supplyai/pull/90),
  [#91](https://github.com/huangsourcing-ux/supplyai/pull/91),
  [#92](https://github.com/huangsourcing-ux/supplyai/pull/92), and
  [#93](https://github.com/huangsourcing-ux/supplyai/pull/93). Final main commit
  `9c646aab48704216adc96d9f2765c5146ce89662` passed
  [CI run 30551758036](https://github.com/huangsourcing-ux/supplyai/actions/runs/30551758036),
  including CMS migration, Core migration, and Staging Release Gate. Vercel
  deployment
  [`J4qaNT2TuagzBHMsacQTmLbneCtt`](https://vercel.com/huangsourcing-2373s-projects/chinasupply-web-staging/J4qaNT2TuagzBHMsacQTmLbneCtt)
  completed for the exact commit. Railway correctly skipped API and Worker
  deployment because their watched paths were unchanged.
- Anonymous MAP-1 returned Dongguan ID `TjP3dEJaEU1TNHt9EBCsZ` as published,
  with slug `dongguan-electronic-information`, name
  `Dongguan Electronic Information Cluster`, `factoryCount: 5`, and color
  `#2563EB`.
- The generated source is PNG, 1536 x 1024, 2,386,617 bytes, SHA-256
  `1669ee96109ac4b2af1f38affc5b66c702ad56e7fff3a786cb5da52be758308f`.
  It is an unbranded, text-free landscape editorial illustration with no
  identifiable person or factual real-facility implication; the binary remains
  outside the repository asset tree.
- Canonical Payload Admin completed presign `200`, R2 CORS preflight `204`,
  credential-free R2 PUT `200`, and Media create `201`. The PUT had
  `Content-Type: image/png` and no CMS cookie. Media ID `1` stores
  `staging/articles/media-XhpFDJODSNjxkALtxc-Pp.png`, the required alt,
  `aiGenerated: true`, PNG metadata, 1536 x 1024, and 2,386,617 bytes; creation
  completed only after the server-side R2 HEAD checks passed.
- Article ID `1` was published at `2026-07-30T14:36:22.588Z` with the required
  title, slug, locale, and cover. Its Lexical `clusterCard` block contains only
  `clusterId: TjP3dEJaEU1TNHt9EBCsZ`; publication returned `201` and MAP-1
  returned `200`.
- Anonymous `/guides` and
  `/guides/how-to-explore-an-industrial-cluster` returned `200`. The list has
  the only published English article in reverse publication order. Detail HTML
  contains the title, publication date, visible `AI-generated illustration`,
  Dongguan name, `5 published factories`, and the exact cluster link. It also
  contains the canonical URL, English hreflang, a 155-character body-derived
  description, Article Open Graph metadata, published time, cover URL, and
  cover alt. The detail response reports Next.js prerendering and a 300-second
  stale time.
- Anonymous Payload REST `/api/articles` and `/api/media` both returned `403`.
  Direct CDN HEAD/GET returned `image/png` and 2,386,617 bytes; the downloaded
  SHA-256 exactly matches the source.
- Two failed compatibility attempts created unreferenced staging objects
  `staging/articles/media-s89U7jgwNoE6jFd94jQFG.png` and
  `staging/articles/media-8tONZJVjSZiDZfDVIcNY7.png`. Payload Admin showed no
  corresponding Media rows. Each object was temporarily registered through
  the same authenticated metadata and HEAD-validation path, then deleted via
  Payload (`DELETE 200`) so the storage adapter removed the exact object.
  Cache-busting CDN requests now return `404` for both; the canonical object
  remains `200`, and Media is back to 1-1 of 1.

No Payload cookie, complete presigned URL, R2 credential, or generated binary
is committed. The article remains only on canonical staging; production was not
accessed or modified.

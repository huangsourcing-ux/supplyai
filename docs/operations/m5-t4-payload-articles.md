# M5-T4 Payload articles and Guides acceptance

> Status: implementation complete; canonical staging acceptance pending
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

- [ ] Record implementation PR, exact merged main commit, CI run, CMS/Core
      migration result, Staging Release Gate, and exact-commit Vercel
      deployment.
- [ ] Use built-in image generation to create a landscape editorial
      illustration with no brand, text, identifiable real person, or factual
      real-facility implication. Record source MIME, dimensions, byte count,
      and SHA-256 outside the repository asset tree.
- [ ] In canonical Payload Admin request the client upload URL, perform the
      credential-free PUT, create Media, and confirm server HEAD succeeds. Alt
      must be exactly `AI-generated illustration of a buyer exploring industrial clusters on a digital map`; enable `aiGenerated`.
- [ ] Publish `How to Explore an Industrial Cluster on ChinaSupply.AI` at slug
      `how-to-explore-an-industrial-cluster`, locale `en`, with a Dongguan
      Cluster Card storing only `TjP3dEJaEU1TNHt9EBCsZ`.
- [ ] Confirm `/guides` is reverse-published order and the detail returns SSR
      HTML containing the title, visible `AI-generated illustration`, Dongguan
      name/factory count, and `/clusters/dongguan-electronics` link.
- [ ] Confirm canonical, English hreflang, description, article Open Graph,
      `publishedTime`, cover URL, and cover alt in returned metadata.
- [ ] Confirm anonymous Payload REST requests for `articles` and `media` are
      rejected and public pages still render through strict Local API reads.
- [ ] Compare generated source and CDN GET MIME, byte count, and SHA-256; HEAD
      must report the same MIME and length. Record objectKey but no signed URL.
- [ ] Submit non-sensitive evidence on
      `codex/m5-t4-staging-acceptance`, append the closeout log, check M5-T4,
      and advance Next Action to M5-T5. Do not migrate the article to
      production.

## Implementation-phase result

The implementation branch includes the frozen v1.6/v1.7 document update,
Payload models and generated artifacts, explicit CMS migration, R2 upload
chain, `/guides` pages, Cluster Card picker/rendering, tests, and this acceptance
runbook. Local migration execution succeeded. M5-T4 remains unchecked until
every canonical staging checklist item above is complete.

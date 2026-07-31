# M5-T7 Static Pages and SEO

Date: 2026-07-31

Scope: PRD F-10.3, F-10.4, F-11.1, F-11.2, N-2, and N-6

## Implemented

- Added the English `/about` static page with the approved product scope,
  sourcing workflow, directory limitations, and the same operating-company
  contact details used by the legal pages.
- Added `/about` and `/guides` to the public navigation. The navigation remains
  horizontally scrollable without causing page-level overflow at a 390 px
  viewport.
- Added canonical URL, English hreflang, description, and Open Graph metadata
  for `/`, `/about`, `/guides`, `/privacy`, and `/terms`. Existing
  cluster/factory/guide detail metadata remains the source for dynamic routes.
- Added `noindex, nofollow` metadata to account, favorites, public sign-in, and
  the complete `/ops` route tree.
- Added an automatically generated `/sitemap.xml`. It follows every opaque
  cursor from A-1 and A-4 with `limit=100`, includes all published
  clusters/factories, includes all published English Payload guides, and
  contains the public static routes. Published timestamps become
  `lastModified`; every entry reserves the English language alternate.
- Added `/robots.txt`. Local and staging disallow all indexing. Production
  allows public routes, points to `/sitemap.xml`, and disallows private,
  authenticated, CMS, and API paths.
- Preserved all existing F-10.4 empty states. Added a reduced-motion-aware,
  screen-reader-labelled list skeleton to Guides, Saved, `/ops`, and cluster
  factory continuation loading. A route-level cluster `loading.tsx` was
  intentionally not added because the existing test contract keeps the 404
  decision outside a streaming boundary.
- Reused the existing `MapAttribution` component. No attribution text, provider
  URL, visibility, or map integration was rewritten.

## Automated evidence

The implementation includes:

- unit coverage for About semantics and contact details;
- canonical/hreflang/Open Graph metadata coverage;
- sitemap pagination, repeated-cursor rejection, absolute routes,
  `lastModified`, and English alternates;
- production versus non-production robots behavior;
- accessible card/row skeleton markup and Saved loading integration;
- Playwright coverage for `/about`, contact links, public navigation,
  canonical/hreflang, 390 px overflow, sitemap XML, and non-production robots.

The local Lighthouse SEO run scored 66 only because the required
non-production `robots.txt` deliberately blocks indexing. Every other
applicable SEO audit passed; the structured-data audit was not applicable.
This result must not be presented as a production SEO score. A production
Lighthouse score remains part of the closure gate after deployment.

Commands and final results are recorded in `开发日志.md` with the delivery
commit.

## Canonical staging acceptance

Implementation PR
[#98](https://github.com/huangsourcing-ux/supplyai/pull/98) was squash-merged
as main commit `36221cce749c2fca47368a956de7fefc53edebcd`. GitHub Actions run
[30607459365](https://github.com/huangsourcing-ux/supplyai/actions/runs/30607459365)
completed successfully, including CI Gate, CMS migration, Core migration, and
Staging Release Gate.

Vercel deployment `dpl_3kTYzcEy33eiKHFGPo7UtseBUo83` reached `READY` with the
Production target of the staging-only `chinasupply-web-staging` project. Its
aliases include `https://staging.chinasupply.ai`, and the deployment is linked
to exact main commit `36221cce749c2fca47368a956de7fefc53edebcd`.

The following acceptance checks passed on the canonical staging alias:

- `/`, `/about`, `/privacy`, `/terms`, `/guides`, `/sitemap.xml`, and
  `/robots.txt` returned HTTP 200. `/account`, `/favorites`, and `/sign-in`
  returned HTTP 200 with `noindex, nofollow`; unauthenticated `/ops` returned
  the expected 307 redirect to its protected sign-in route.
- The sitemap contained 15 canonical staging URLs: five static routes, two
  published clusters, seven published factories, and one published guide.
  Every URL used the exact staging origin and returned HTTP 200.
- `/`, `/about`, `/guides`, `/privacy`, and `/terms` exposed their expected
  title, description, canonical URL, and English hreflang. Staging
  `/robots.txt` contained `Disallow: /` as required by the environment policy.
- `/about` rendered the approved operating-company identity and email action.
  At a 390 px viewport, the document width remained exactly 390 px with no
  page-level horizontal overflow.
- The home map, Dongguan cluster preview, and Dongguan Amperex factory location
  map each completed canvas rendering and visibly exposed `© MapTiler` and
  `© OpenStreetMap contributors`.
- `pnpm test:web:e2e:staging` passed 5/5 tests against the canonical alias,
  covering both legal pages, the registration legal links, real Planet v4
  TileJSON/PBF/glyph/sprite resources, API-backed search, all three map scenes,
  and persistent glyph caching.
- Vercel returned zero error-level runtime log entries for the exact deployment
  during the acceptance window. The browser emitted only the expected Clerk
  Development-instance warning for staging.

Lighthouse 12.8.2 reported SEO 66 for canonical staging `/about`. The only
failed audit was `is-crawlable`, caused by the required staging-wide
`Disallow: /`; title, description, status code, link text, crawlable anchors,
valid robots syntax, canonical, and hreflang all passed. Structured data was a
manual audit and image alt was not applicable. This result remains an
environment-policy consequence and is not a production SEO score.

## Production read-only review

Initially checked at `2026-07-31T05:16Z` and repeated three times at
`2026-07-31T05:54Z`, without changing external state:

| Target                                   | Result                                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET https://www.chinasupply.ai/privacy` | HTTP 404 in three consecutive requests                                                                                             |
| `GET https://www.chinasupply.ai/terms`   | HTTP 404 in three consecutive requests                                                                                             |
| `GET https://www.chinasupply.ai/`        | HTTP 200, but it serves the pre-existing supplier-intelligence landing page rather than this repository's approved map application |
| `GET https://www.chinasupply.ai/map`     | HTTP 404; the repository's MapLibre page and its MapTiler/OpenStreetMap attribution are not available to review on production      |

Therefore the development-plan premise that `/privacy` and `/terms` are
already live on production does not match the observed production state.
F-11.1 and F-11.2 cannot be accepted on production in this task. M5-T7 remains
unchecked.

## Owner-approved early Web cutover

On 2026-07-31 the Owner authorized M5-T8a/M5-T9 Web production prerequisites
to run inside the M5-T7 closure task so this repository can replace the
unrelated old `www` content. The Owner also classified the current site as
non-commercial development/acceptance, so the frozen documents now permit a
separate apex/`www`-restricted MapTiler Free R&D key until the commercial
Flex gate.

Production R2/Clerk/Vercel/PostGIS prerequisites and both schema-owner
migrations have begun. The operational evidence and remaining external gates
are recorded in:

- `docs/operations/m5-t8a-production-content.md`;
- `docs/operations/m5-t9-web-production-preflight.md`.

This authorization removes the former sequencing conflict, but it does not
replace real production acceptance or permit a premature checkbox.

## Closure gate

After this exact implementation commit is deployed to the canonical production
site, an authorized reviewer must confirm:

1. `/privacy`, `/terms`, `/about`, `/robots.txt`, and `/sitemap.xml` return
   HTTP 200 on the canonical production origin;
2. the production sitemap includes published cluster, factory, and guide
   routes and contains no draft/private routes;
3. the home, cluster preview, and factory location maps visibly show MapTiler
   and `© OpenStreetMap contributors` attribution;
4. canonical URLs and English hreflang point to the production origin;
5. the production deployment is the reviewed exact commit.

The Owner has authorized the early Web deployment and revised the frozen
wording. This gate still remains pending until the exact implementation commit
actually replaces the old `www` deployment and every check above passes.

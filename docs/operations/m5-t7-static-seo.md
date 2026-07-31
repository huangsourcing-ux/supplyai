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

## Production read-only review

Checked at `2026-07-31T05:16Z` without changing external state:

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

The current approved order places production cutover in M5-T9. Unless the Owner
separately authorizes an earlier production deployment or revises the
M5-T7 production wording, this production-only gate must remain pending until
M5-T9.

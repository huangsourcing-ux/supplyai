# M5-T8a Production Content Migration

Date: 2026-07-31

Status: implementation complete; external credential, export/import, and
production review gates pending

## Approved source set

The Owner authorized M5-T8a Web prerequisites to run early as part of the
M5-T7 production cutover. The explicit curation allowlist is
`data/production/curation.json`; it is not inferred from every row in staging.
Its evidence traces back to the canonical `/ops`, factory-remediation, and
Payload acceptance records.

The current allowlist contains:

- 2 published canonical clusters;
- 6 published and verified canonical factories;
- 1 published English guide and its Payload-owned cover medium.

Every identifier is explicit. The export rejects missing, extra,
`synthetic`, `fixture`, or `test` identifiers. Factories must still be
`published + verified` in the source database, and every selected factory
must belong to a selected cluster. `seed:real` remains hard-blocked in
production.

`yiwu-yayu-textile` is deliberately excluded even though the factory itself
is published and verified: its referenced `yiwu-small-commodities` cluster is
still Draft. Migrating that unpublished dependency would violate the curated
cluster gate, while nulling or changing the relationship would rewrite
canonical data. Yayu remains in staging until its cluster independently
passes curation.

## Versioned migration chain

Run from the repository root:

```bash
APP_ENV=staging \
pnpm --filter @chinasupply/api production:content \
  export --confirm-curated-staging
```

The export command:

1. validates the curation file with Zod;
2. reads only the selected published/verified rows and their region/category
   dependencies from canonical staging;
3. captures WGS-84 Point/MultiPolygon values as GeoJSON;
4. copies only referenced factory and Payload media from the staging media
   bucket into the empty-prefix production media bucket;
5. removes exactly the leading `staging/` segment from production object
   keys;
6. verifies every copied object by MIME, bytes, and SHA-256 metadata;
7. writes the canonical JSON dataset and a separate manifest to the private
   production bucket under `migrations/m5-t8a/...`;
8. verifies the uploaded dataset by R2 HEAD and SHA-256.

The CLI prints only object keys, counts, slugs, bytes, and digests. It does not
print database URLs, R2 credentials, presigned URLs, contacts beyond the
canonical dataset, or Clerk secrets.

After both production schema-owner migrations succeed, import with:

```bash
APP_ENV=production \
pnpm --filter @chinasupply/api production:content \
  import <manifest-object-key> --confirm-production-draft
```

The import reads the manifest and dataset back from the private production
bucket, verifies every digest and media HEAD, and writes one transaction. Core
IDs are preserved so the Lexical Cluster Card continues to reference its
canonical cluster. All clusters are forced to `draft` with no
`publishedAt`; all factories are forced to `draft + unverified` with every
production verification field cleared; guides are forced to Payload draft.
No source status value can bypass those resets.

## Current production evidence

- The dedicated production PostGIS 17.5 / PostGIS 3.5 database is online.
- The Core migration and both Payload migrations completed successfully.
- The empty production database has 21 public user tables, one Drizzle
  migration record, two Payload migration records, and zero cluster, factory,
  or article rows.
- The two production R2 buckets and `media.chinasupply.ai` custom media domain
  exist; production media CORS is limited to the apex and `www` origins.
- A read-only validation against canonical staging completed with 2 regions,
  4 categories, 2 clusters, 6 factories, 1 article, and 1 medium. The selected
  slugs exactly matched `data/production/curation.json`, and every selected
  core row was still `published + verified + curated`.
- The implementation unit suite passes 47 files / 170 tests, including the
  M5-T8a synthetic-namespace, exact-allowlist, and prefix safety tests.

## Remaining acceptance gates

M5-T8a remains unchecked until all of the following are real:

1. a bucket-scoped production R2 API token is created by an authorized
   Cloudflare account member and installed without exposing it;
2. export completes and records the immutable manifest object key, dataset
   SHA-256, counts, slugs, and copied-media digests here;
3. production Draft import completes and count/status verification passes;
4. an authenticated production admin compares the manifest, samples the
   records and media, verifies factories through `/ops`, and publishes only
   approved records;
5. public APIs and the production sitemap show exactly the approved published
   subset, while every other staging row remains absent.

The current implementation and production migrations are necessary evidence,
not permission to mark M5-T8a complete.

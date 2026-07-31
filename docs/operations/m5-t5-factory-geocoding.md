# M5-T5 factory geocoding

## Implementation status

This implementation PR adds the coordinate-less CSV/JSON → private R2 →
BullMQ → Amap → GCJ-02/WGS-84 → PostgreSQL path required by PRD F-9.2. It does
not complete the external acceptance gate: M5-T5 remains unchecked until the
merged exact commit is deployed and a real canonical staging sample succeeds
with an encrypted Amap Web Service key.

No database migration, public/Admin API, OpenAPI/Orval artifact, Web, Mobile,
Payload collection, batch image workflow, job UI, or monitoring alert is
changed.

## Local and automated verification

Use one of the committed coordinate-less templates:

```bash
pnpm --filter @chinasupply/api geocode:factories -- \
  ./docs/import-templates/factories-geocode.json
```

Required CLI environment is the existing Redis and private R2 import slice.
The Worker additionally reads:

```text
AMAP_WEB_SERVICE_KEY=<encrypted Web Service key>
AMAP_GEOCODING_BASE_URL=<local test override only>
```

The Testcontainers import suite starts PostGIS 17/PostGIS 3.5, Redis 7.4,
MinIO, and a local fake Amap HTTP endpoint. It verifies:

- private R2 source/report object isolation and BullMQ dispatch;
- successful and zero-result rows in one file;
- first-ranked match metadata and sequential processing;
- original GCJ-02 retention, shared WGS-84 conversion, and SRID 4326;
- shared category/reference validation and search-text generation;
- repeatable slug upsert without duplicate records;
- existing published state preservation together with
  `verified=false` and all verification audit fields cleared.

## Canonical staging acceptance gate

Do not perform this section from an implementation or preview deployment.
After the implementation PR is merged:

1. Confirm CI, CMS migration, core migration, Staging Release Gate, and the
   Railway Worker deployment all use the same exact `main` commit.
2. Store an Amap **Web Service** key only in the Railway staging Worker
   encrypted variables. Do not put it in the API service unless the platform
   shares service variables intentionally.
3. Select one Owner-approved, real canonical factory source row that is
   intended to remain `draft + unverified`. The input file must omit
   `location`; do not invent a synthetic published entity and do not target
   production.
4. Run `geocode:factories`, retain only the job ID and private object keys, and
   inspect the private report. Never record the key, full request URL, token,
   R2 credentials, or raw source document.
5. Confirm through the authenticated Admin/`/ops` read path that the WGS-84
   point is present, the record remains draft, and verification/audit fields
   are false/null. Compare the report's GCJ-02 and WGS-84 coordinates with the
   independent source/SOP; geocoding is not verification.
6. Confirm anonymous public endpoints do not expose the draft record. Do not
   verify or publish merely to close this task.

Record the exact commit/deployment, sample slug, job ID, report objectKey,
non-sensitive match metadata, coordinate checks, draft isolation, and
verification state in a separate
`codex/m5-t5-staging-acceptance` documentation PR. Only after every item passes
may that PR check M5-T5, advance Next Action to M5-T6, update `AGENTS.md`, and
append the closing development-log entry.

## Current external blocker

- `AMAP_WEB_SERVICE_KEY` was not present in the repository or local environment
  when implementation began.
- No canonical staging row was selected or written by this implementation PR.
- Production is untouched.

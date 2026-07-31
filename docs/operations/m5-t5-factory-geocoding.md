# M5-T5 factory geocoding

## Completion status

Commit `6a55259203767fe85b5bd22c569d3cdf8fbc065a` adds the coordinate-less
CSV/JSON → private R2 → BullMQ → Amap → GCJ-02/WGS-84 → PostgreSQL path
required by PRD F-9.2. On 2026-07-30, the Owner explicitly confirmed in the
task that the approved staging scope was complete and verified, and instructed
the implementation PR to check M5-T5 before merge. This document records that
human acceptance conclusion without inventing deployment IDs, job IDs, sample
slugs, private report fields, or other evidence the Owner did not provide.

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

## Canonical staging acceptance scope

The Owner's completion statement covers the approved scope below:

1. Confirm the tested Worker deployment uses the implementation commit being
   accepted.
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

The originally planned separate acceptance PR is superseded by the Owner's
explicit instruction to record acceptance in implementation PR #95, check
M5-T5, and merge it. No production action is authorized by this acceptance.

## Acceptance record

- Accepted by: Owner, via the Codex task
- Accepted at: 2026-07-30
- Accepted implementation commit:
  `6a55259203767fe85b5bd22c569d3cdf8fbc065a`
- Recorded evidence: Owner confirmation only; no sensitive or unprovided
  operational fields are persisted
- Production authorization: none
- Next Action: M5-T6

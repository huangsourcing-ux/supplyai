# Cluster and factory imports

M1-T7 provides internal, asynchronous imports for clusters and factories. The
CLI uploads a CSV or JSON source to the environment's private R2 operations
bucket and enqueues only its object key. The Worker downloads that object,
validates every row, writes valid rows to PostgreSQL, and writes a deterministic
JSON report back to R2. CLI and Worker never share a filesystem.

## Commands

Run core migrations and ensure the API/Worker environment points at the
intended local or staging database, Redis, and private R2 bucket. Then run:

```bash
pnpm --filter @chinasupply/api import:clusters -- ./clusters.csv --source-coordinate-system gcj02
pnpm --filter @chinasupply/api import:factories -- ./factories.json --source-coordinate-system wgs84
```

Only `.csv` and `.json` files are accepted. The coordinate-system flag is
required and applies to every coordinate in the file. The command prints one
JSON object containing `jobId`, `sourceObjectKey`, and `reportObjectKey`.
Completion is observed in Worker logs and the report object; V1 deliberately
has no import-status HTTP endpoint or `/ops` job UI.

The four canonical templates are in `docs/import-templates/`. JSON documents
use `{ "version": 1, "rows": [...] }`. CSV headers must match the template
exactly. Array, object, and GeoJSON CSV cells contain JSON. An empty nullable
cell becomes `null`; an empty list cell becomes `[]`.

## References and writable fields

- `regionId` is an existing 21-character region ID.
- `primaryCategorySlug`, `categorySlugs`, and `clusterSlug` reference existing
  slugs. A cluster's primary category must also appear in `categorySlugs`.
- Cluster `centroid` and factory `location` use `[lng, lat]`. Cluster
  `boundary`, when present, is a GeoJSON `MultiPolygon`.
- Import files never accept `id`, `status`, `publishedAt`, `verified`,
  `verifiedAt`, `lastVerifiedAt`, or `verifiedBy`.

New records are draft and factories are unverified. A rerun replaces every
import-managed field, including nullable values and category relations, while
preserving the entity ID and all publish/verification state. All occurrences
of a duplicated slug in one file fail rather than using last-write-wins.

For GCJ-02 input, all cluster point/polygon coordinates are converted to
WGS-84 and the source coordinates are discarded. Factory locations are
converted to WGS-84 while the original point is retained in `location_gcj02`.
WGS-84 factory input clears any previously retained GCJ-02 point.

## Objects and reports

Objects use these private-bucket keys:

```text
[prefix/]imports/{clusters|factories}/{jobId}/source.{csv|json}
[prefix/]imports/{clusters|factories}/{jobId}/report.json
```

The report contains row numbers, slugs, insert/update actions, validation or
reference issues, totals, and an optional fatal message. It never copies the
full source row. A row validation/reference/constraint failure does not block
other rows. File parsing, R2, Redis, or database infrastructure failures fail
the BullMQ job; retries reuse the job ID and overwrite the same report.

Remote environments always derive the Cloudflare S3 endpoint from
`R2_ACCOUNT_ID`. `R2_ENDPOINT` is an optional local/test-only override for an
S3-compatible service such as MinIO. Credentials must have Object Read/Write
only on the matching private operations bucket and must never be logged.

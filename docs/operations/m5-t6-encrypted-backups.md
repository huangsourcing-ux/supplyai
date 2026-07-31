# M5-T6 encrypted PostgreSQL backups

This runbook covers the F-9.3 implementation for the shared PostgreSQL
database. A backup includes every schema visible to `pg_dump`, including the
Drizzle-owned core tables and Payload-owned CMS tables. R2 media objects are
outside this backup.

The implementation PR does not enable a remote scheduler or complete the
required staging restore drill. Those actions happen only after the exact
implementation commit is merged and deployed. Production remains out of scope
until M5-T9.

## Runtime and schedule

The API and Worker use the repository-root multi-stage Dockerfile. The runtime
locks these tools:

```text
node v22.23.1
pnpm 10.33.2
pg_dump (PostgreSQL) 17.x
pg_restore (PostgreSQL) 17.x
age 1.3.0
```

The Worker owns the `maintenance` queue. On bootstrap it uses BullMQ
`upsertJobScheduler` for scheduler `postgres-backup-daily-v1`, job
`backup:daily`, pattern `0 0 3 * * *`, and timezone `UTC`. The upsert makes
repeated Worker starts idempotent. The processor concurrency is one. A job gets
three attempts with exponential backoff starting at 60 seconds; the queue also
persists a global concurrency of one so overlapping Worker deployments cannot
run two backups. Each backup job and each restore pipeline has a 30-minute
timeout.

Local defaults to `BACKUP_ENABLED=false`. Before a staging or future production
Worker can start, set both:

```text
BACKUP_ENABLED=true
BACKUP_AGE_RECIPIENT=<public age X25519 recipient>
```

Do not add these variables to the API service. The remote Worker deliberately
fails startup when backup is not explicitly enabled or the recipient is
missing.

After deployment, confirm the Worker bootstrap log contains exactly one
upsert for `postgres-backup-daily-v1` and reports the next job timestamp.
Restart the Worker and confirm the same scheduler ID is updated rather than a
second scheduler being created. Convert the reported timestamp to UTC and
verify the next occurrence is 03:00.

## Dedicated age key

Generate the key only on an Owner-controlled offline machine with age 1.3.0:

```bash
umask 077
age-keygen -o /absolute/offline/path/chinasupply-postgres-backup.agekey
age-keygen -y /absolute/offline/path/chinasupply-postgres-backup.agekey
chmod 600 /absolute/offline/path/chinasupply-postgres-backup.agekey
```

The second command prints the public recipient. Only that `age1...` recipient
is copied to the Worker. Never put the identity file or its contents in
Railway, R2, Git, shell history, logs, screenshots, CI artifacts, environment
examples, or support messages. Keep at least two encrypted/offline copies under
Owner control.

For rotation, generate a new identity, store it offline, update only the public
Worker recipient, deploy, and create a manual backup. Restore that new backup
before retiring the old identity. Retain the old identity until every backup
encrypted to it has passed the 30-day retention window.

## Backup object format and retention

Successful jobs write a stable pair under the current environment's private
R2 prefix:

```text
<R2_PREFIX>/backups/postgres/YYYY/MM/DD/<UTC-job-timestamp>.dump.age
<R2_PREFIX>/backups/postgres/YYYY/MM/DD/<UTC-job-timestamp>.manifest.json
```

The manifest contains the format version, environment, creation time, trigger,
commit SHA, PostgreSQL tool versions, encrypted object size, and SHA-256. It
contains no database URL or key material. The encrypted object also carries
the SHA-256 in R2 metadata. A job is successful only after R2 HEAD confirms
the encrypted size/digest and manifest size.

Only then does the job page through the exact
`<R2_PREFIX>/backups/postgres/` namespace and delete objects whose R2
`Last-Modified` is strictly older than the rolling 30 × 24 hour boundary and
whose key ends in `.dump.age` or `.manifest.json`. Cleanup never deletes
unknown objects, imports, reports, media, or another environment prefix.
Cleanup failure fails the job. Retries retain the original BullMQ job
timestamp, so they overwrite the same pair instead of creating duplicates.

## Manual staging backup

Run only after the merged exact commit is healthy on the staging Worker:

```bash
pnpm backup:run -- --confirm-staging
```

The command only enqueues and waits. Its JSON output is restricted to job ID,
object key, encrypted bytes, SHA-256, and status. Check the private R2 pair and
HEAD metadata independently. Do not paste presigned URLs, credentials, or
database URLs into the command line.

The separate production confirmation is:

```bash
pnpm backup:run -- --confirm-production
```

It exists to prevent an accidental environment mix-up and must not be used for
M5-T6.

## Isolated restore

Create a disposable PostgreSQL/PostGIS 17 target with a new empty database.
The target must not share a database or volume with canonical staging. Put
`DATABASE_URL`, `RESTORE_DATABASE_URL`, and the staging private-R2 variables in
the process environment; never pass either database URL as a CLI argument.

Mount the offline identity read-only into the local maintenance container, or
run the compiled command in an equivalent locked runtime:

```bash
RESTORE_DATABASE_URL='<isolated target URL>' \
pnpm backup:restore -- \
  --manifest-key 'staging/backups/postgres/YYYY/MM/DD/<timestamp>.manifest.json' \
  --identity-file '/absolute/read-only/path/chinasupply-postgres-backup.agekey' \
  --confirm-isolated-target
```

The identity path must be absolute, refer to a regular file, and have no
group/other permission bits. Before restore, the command rejects:

- the same source and target database identity;
- a source or target PostgreSQL major other than 17;
- a target containing any non-extension user table or any non-public user
  schema;
- a manifest outside the current environment backup prefix;
- a manifest that references a different dump pair or environment;
- an R2 HEAD, byte count, or SHA-256 mismatch.

It first streams age decryption to `pg_restore --list`, then decrypts again
directly to:

```text
pg_restore --exit-on-error --no-owner --no-privileges
```

Only encrypted temporary data is stored on disk. The command compares PostGIS
versions, the complete non-extension user-table list, and every table row count
between source and restored databases. A mismatch fails acceptance.

For the canonical staging drill, also record the merged commit, Worker tool
versions, scheduler next-run time, non-sensitive object/manifest keys, size and
digest, PostGIS version, migration-table presence, table count, and row-count
comparison. Confirm staging was not written. Then delete the disposable
Railway service and volume, remove local ciphertext, and return the identity to
offline storage. Record only non-sensitive evidence in the separate
`codex/m5-t6-staging-acceptance` PR before checking M5-T6 complete.

## Canonical staging acceptance — 2026-07-31

Implementation PR #96 merged as main commit
`30b112be98c4e6e5efdcd6a5b427a6b322b58eea`. GitHub Actions run
`30602026928` passed CI Gate, CMS migration, Core migration, and Staging
Release Gate. Railway then deployed that exact commit successfully as API
deployment `ab6169c4-fae0-43c1-9939-5649b90d5df9` and Worker deployment
`422ba6c4-6df8-4f12-b70f-14894c2f175c`. The Worker image reported Node
22.23.1, pnpm 10.33.2, pg_dump/pg_restore 17.5, and age 1.3.0. Only the
Worker received `BACKUP_ENABLED=true` and the public age recipient; the API
had neither backup variable.

The Owner-authorized dedicated age identity was generated locally with the
locked age 1.3.0 image. Its directory was mode `0700`; the identity and public
recipient files were mode `0600`, and an in-memory encrypt/decrypt round trip
passed. The identity was never copied to Railway, R2, Git, a command argument,
or an environment variable.

The persisted BullMQ scheduler had key `postgres-backup-daily-v1`, job name
`backup:daily`, pattern `0 0 3 * * *`, timezone `UTC`, and next occurrence
`2026-08-01T03:00:00.000Z`. A package-local invocation with an extra `--` was
rejected by the confirmation preflight before Redis or R2 access. The
subsequent compiled CLI invocation created job
`backup-rlbJxdxJJCmku2SBo7OfJ` and completed this stable pair:

```text
staging/backups/postgres/2026/07/31/2026-07-31T03-48-16-514Z.dump.age
staging/backups/postgres/2026/07/31/2026-07-31T03-48-16-514Z.manifest.json
```

Independent reads confirmed a 699-byte manifest, a 166813-byte encrypted
object, and matching R2 HEAD/manifest SHA-256
`9efdac16a203dfde6cb3b9bcd2f5e09c84ef402cd6f64334c4e9690b2218e2e9`.
The manifest recorded environment `staging`, trigger `manual`, source commit
`30b112be98c4e6e5efdcd6a5b427a6b322b58eea`, PostgreSQL major 17, pg_dump and
pg_restore 17.5, and age 1.3.0.

A disposable Railway service `m5-t6-restore`
(`6eba0b94-b2bf-4150-a2e8-094ebd65e1d0`) used
`postgis/postgis:17-3.5`, dedicated volume
`515cdf3a-57f3-4345-bf2c-55de842d5709`, and a temporary TCP proxy. The
`restore_target` database was created from `template0`; preflight reported
PostgreSQL `170005`, zero user tables, and zero non-public user schemas. The
first credential fetch hit a transient Railway TLS EOF and failed before
target connection or restore. The retry made credential retrieval atomic,
mounted the local identity read-only into the maintenance image, and exited
zero after decrypt/list/restore and the built-in comparison.

The final independent read-only comparison produced identical source and
restored results:

```text
PostgreSQL server_version_num: 170005
PostGIS: 3.5.2
non-extension user tables: 21
total rows: 293
inventory + per-table row-count SHA-256:
eaee2d27214e7a6a1b0bf6b1909f66ec518af5bb05e941c693f04cd54c4a55fe
drizzle.__drizzle_migrations rows: 1
public.payload_migrations rows: 2
```

The source and target resolved to distinct live database identities, and the
source connection was used only for read-only inventory queries. The
disposable service and TCP proxy were removed. Its dedicated volume entered
Railway pending deletion, with physical purge scheduled after Railway's
recovery window. No local ciphertext or restore container remained; the
identity stayed only in the Owner-controlled local directory. Production was
not accessed or modified.

## Failure handling

- **Startup version error:** do not bypass it. Confirm the deployed image and
  source database both use PostgreSQL major 17 and age 1.3.0.
- **`pg_dump`/age failure or timeout:** inspect bounded Worker diagnostics and
  Sentry. Connection strings and configured secrets are redacted. Retry the
  same job; its stable object key avoids duplicates.
- **Upload or HEAD mismatch:** treat the pair as incomplete. Fix R2
  connectivity/permissions and retry. Never restore from a pair that fails
  manifest and HEAD validation.
- **Retention deletion failure:** the job fails even though the new pair is
  valid. Restore delete permission only for the private operations bucket and
  retry; do not grant bucket lifecycle administration.
- **Wrong identity or digest mismatch:** stop. Recheck the offline identity and
  selected manifest without weakening validation or copying the identity to a
  cloud environment.
- **Non-empty or wrong restore target:** destroy and recreate the disposable
  target. Do not add flags that clean, drop, or overwrite an existing database.
- **Partial restore:** discard the entire isolated service and volume before
  retrying. Never repair it in place and never point the command at canonical
  staging or production.

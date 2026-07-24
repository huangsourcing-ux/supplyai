# API load testing

M1-T9 provides an isolated k6 baseline for MAP-1 response size, MAP-3 with
5,000 factory points, and A-6 search. It never connects to staging or
production.

## Prerequisites

- Node.js and pnpm versions supported by the repository
- A running Docker-compatible container runtime
- Enough local disk space to pull the pinned PostGIS, Redis, and
  `grafana/k6:2.0.0` images

No application environment file or external service credentials are needed.

## Run locally

From the repository root:

```bash
pnpm test:load
```

The command performs the following work:

1. Starts disposable PostGIS 17/PostGIS 3.5 and Redis 7.4 containers.
2. Applies the real core migration.
3. Loads the M1-T8 reference data, 10 published clusters, and exactly 5,000
   published synthetic factories. Search text is built with the production
   shared generator.
4. Starts the real NestJS application on a random local port.
5. Verifies MAP-1, MAP-3, and search response envelopes before load starts.
6. Runs MAP-3 and search separately with a 5-second ramp to 10 VUs, 30 seconds
   at 10 VUs, and a 5-second ramp down.
7. Stops and removes every disposable container.

Results are written to the ignored `.generated/load-results/` directory:

- `report.json`: combined environment, fixture, gzip, p50, and p95 evidence
- `map1-size.json`: MAP-1 raw and gzip byte counts
- `map-factories-summary.json` and `search-summary.json`: raw k6 summaries
- `map-factories.log` and `search.log`: complete k6 console output

The command fails when HTTP checks fail or any frozen threshold is missed:

- MAP-1 gzip size must be below 500,000 bytes.
- MAP-3 p95 must be below 500 ms.
- Search p95 must be below 300 ms.

## Rate limiting boundary

The load-only Nest testing module replaces `ClientIpThrottlerGuard`. Without
that replacement, all requests from the k6 container share one client IP and
the required 60 requests/minute/IP policy would measure 429 responses instead
of query performance.

Production configuration is not changed. The real Redis-backed rolling
window, per-route isolation, shared multi-instance budget, and 429 envelope
remain covered by `apps/api/e2e/rate-limit.e2e.ts`.

## GitHub Actions

The `API load baseline` workflow is manual (`workflow_dispatch`) and uploads
`.generated/load-results/` for 30 days even if a threshold fails. It is
intentionally not part of the pull-request gate because shared runner
contention makes latency thresholds noisy. M5-T8 repeats the test with the
approved real-data volume.

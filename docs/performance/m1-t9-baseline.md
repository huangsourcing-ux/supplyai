# M1-T9 API load baseline

> Status: Passed
>
> Run date: 2026-07-24
>
> Dataset: M1-T8 deterministic synthetic load fixture

## Test profile

- Isolated PostGIS 17/PostGIS 3.5 and Redis 7.4 Testcontainers
- `grafana/k6:2.0.0`
- 10 published clusters and exactly 5,000 published synthetic factories
- 5-second ramp to 10 VUs, 30 seconds at 10 VUs, 5-second ramp down
- MAP-3 and search executed separately with one-second user pacing
- Fixture SHA-256:
  `edb179078c2d4e78f2d487d3b663924922b443b25af81e0c95b7237cd30f4667`

## Results

| Check                   |    Result | Frozen threshold | Status |
| ----------------------- | --------: | ---------------: | ------ |
| MAP-1 raw JSON          |   2,981 B |    Informational | Pass   |
| MAP-1 gzip              |     806 B |      < 500,000 B | Pass   |
| MAP-3 p50, 5,000 points | 163.53 ms |    Informational | Pass   |
| MAP-3 p95, 5,000 points | 196.46 ms |         < 500 ms | Pass   |
| Search `q=led` p50      |  78.81 ms |    Informational | Pass   |
| Search `q=led` p95      | 139.84 ms |         < 300 ms | Pass   |

All k6 HTTP and content-type checks passed with zero failed requests.

## Execution environment

- Source base commit: `7ebe6a9f5c64635042cf0bcdc379c5020ddeb6b9`
- Host: Apple M4, 10 CPU cores, 16 GiB RAM, arm64
- OS: macOS/Darwin 25.5.0
- Docker: 29.1.3
- Node.js: 24.18.0
- k6: 2.0.0, linux/arm64

This is an M1 isolated synthetic baseline, not production capacity evidence.
The manual GitHub workflow records the exact tested branch commit in its
artifact. M5-T8 must rerun against the approved real-data volume and deployment
environment.

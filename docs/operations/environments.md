# Environment contract

ChinaSupply.AI uses three isolated environments. Values must never fall back from one environment to another.

| Environment | Database and Redis             | Clerk                              | R2                                    | Public URLs              |
| ----------- | ------------------------------ | ---------------------------------- | ------------------------------------- | ------------------------ |
| Local       | Docker Compose on loopback     | Development keys                   | `dev` prefix                          | `localhost`              |
| Staging     | Railway staging resources      | Development instance and test keys | `staging` prefix                      | HTTPS `staging.*`        |
| Production  | Dedicated production resources | Production instance and live keys  | Dedicated bucket with an empty prefix | HTTPS production domains |

## Local setup

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
pnpm infra:up
pnpm infra:check
```

`pnpm infra:down` stops containers while preserving the named volumes. M0-T2 intentionally provides no command that deletes volumes.

The locked `postgis/postgis:17-3.5` image currently publishes an amd64 manifest. `compose.yaml` therefore declares `linux/amd64`; Docker Desktop uses its built-in emulation on Apple Silicon, while Linux CI runs the same image natively.

## Validation ownership

- `@chinasupply/config/env/api` validates server-only API and Worker configuration.
- `@chinasupply/config/env/web` validates Payload/Next.js server values and explicitly public Web values.
- `@chinasupply/config/env/mobile` accepts only the documented `EXPO_PUBLIC_*` application values and rejects known server secrets.

The application bootstrap introduced by M0-T3, M0-T4, and M0-T5 must call the matching parser before starting. Validation failures report field names only; values must never be logged.

Real secrets live in the deployment platform or GitHub Environment. `.env.example` files contain local defaults and explicit placeholders only. No `.env`, `.env.local`, staging credential, or production credential may be committed.

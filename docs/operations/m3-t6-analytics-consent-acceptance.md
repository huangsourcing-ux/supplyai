# M3-T6 analytics consent staging acceptance

> Status: **Verified on canonical staging**
>
> Acceptance completed: 2026-07-26 22:44 EDT (America/New_York)
>
> Scope: F-11.3, F-1.7, and N-4 on canonical staging only. Production, Mobile,
> API, database, Payload schema, and analytics event interfaces were not accessed
> or changed.

## Deployed baseline

- M3-T6 implementation merged through PR #57 and is present in exact `main`
  commit `4e15af65a7c0ac36f00a981fc1e6d9d7ad1c8b30`.
- [CI run 30228961672](https://github.com/huangsourcing-ux/supplyai/actions/runs/30228961672)
  completed successfully for that exact commit.
- Vercel deployment `dpl_6cRPprpt6s5Wb5kgXEQxHMZLNvwR` was re-inspected
  immediately before acceptance: it was `READY`, used the staging project's
  controlled Production target, and owned the canonical
  `staging.chinasupply.ai` alias.
- Public canonical data used for the checks was
  `/clusters/dongguan-electronic-information` and
  `/factories/dongguan-luxshare-precision`.

## Consent-state acceptance

Only analytics-related local storage for `https://staging.chinasupply.ai` was
cleared to establish the clean state. The authenticated PostHog project was
used only to inspect staging Live Events. Chrome DevTools resource inspection
recorded only matching request host/path counts; no request body, project key,
headers, cookie, or user identifier was copied into this record.

| State     | Canonical staging evidence                                                                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unknown` | The first-visit Consent banner and Privacy Policy entry were visible. Search, map movement, and supplier-detail navigation produced 0 PostHog-matching resource requests.                                                          |
| `denied`  | Reject persisted after reload. Repeated search, map movement, cluster view, and factory view still produced 0 matching requests.                                                                                                   |
| `granted` | PostHog loaded only after **Allow analytics** was selected from Analytics settings. The controlled session then produced exactly the seven expected Live Event rows described below.                                               |
| `revoked` | Withdrawing consent stopped capture immediately. A further search, map movement, cluster view, and factory view did not increase the isolated session counts. The browser was left in a persisted rejected state after acceptance. |

With a saved grant, fresh-document checks for the excluded routes found 0
PostHog-matching resource entries on `/sign-in` and `/admin`. Because the
existing admin session was authenticated, `/ops/sign-in` redirected to `/ops`;
the resulting fresh document also contained 0 matching entries. These routes
therefore did not perform the first SDK load.

## Isolated Live Events evidence

The grant scenario used the unique synthetic search marker
`m3t6consent qa@example.com +1 202-555-0100`. Live Events showed the sanitized
query exactly as `m3t6consent [redacted] [redacted]`; neither the source email
nor the source phone appeared. All seven rows shared one anonymous
`distinct_id`; the identifier itself was compared in the UI but intentionally
was not recorded.

| Frozen event              | Count | Frozen custom-property evidence                                |
| ------------------------- | ----: | -------------------------------------------------------------- |
| `search_performed`        |     1 | `query`, `resultCount`                                         |
| `cluster_viewed`          |     1 | `clusterId`, `slug`                                            |
| `factory_viewed`          |     1 | `factoryId`, `slug`                                            |
| `factory_contact_clicked` |     1 | `factoryId`, `slug`, `method` (`website`)                      |
| `navigation_clicked`      |     1 | `factoryId`, `slug`, `provider` (`google`), `platform` (`web`) |
| `map_moved`               |     2 | `bbox`, `zoom`; nullable `categorySlug` was null and hidden    |

The first two rapid map actions produced only one `map_moved`. A controlled
10.5-second wait preceded the next action, after which the second row appeared;
the rapid duplicate remained suppressed. The UI actions also opened the public
official website and Google Maps once each, and the newly opened acceptance
tabs were closed.

Per-event property inspection found no contact value, address, coordinate, or
raw search PII in unrelated custom properties. The isolated session contained
no `$pageview`, autocapture, replay, performance, exception, feature-flag, or
other automatic event. PostHog system metadata was not treated as product event
properties and was not copied into the repository.

## Repository verification

The documentation-only acceptance branch passed the complete required gate:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit                # 475/475 passed
pnpm build
pnpm test:web:e2e             # 10/10 passed
pnpm test:web:e2e:staging     # 4/4 passed on canonical staging
pnpm api:generate:check       # generated API artifacts are stable
pnpm format:check
git diff --check
```

## Result

All M3-T6 canonical staging acceptance checks passed. The synthetic staging
events remain in PostHog project `523616` as required; no event deletion was
performed. Production was not opened, deployed, or modified.

# M3-T7 legal pages release record

> Status: **Approved and verified on canonical staging**
>
> Last updated: 2026-07-26
>
> Scope: F-11.1 `/privacy` and `/terms` for staging only. Production, `/about`, sitemap, API, database, Payload, and Mobile are out of scope.

## Stable routes and environments

| Environment        | Privacy Policy                           | Terms of Use                           | State                                                 |
| ------------------ | ---------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| Local / PR fixture | `/privacy`                               | `/terms`                               | Automated verification in M3-T7                       |
| Canonical staging  | `https://staging.chinasupply.ai/privacy` | `https://staging.chinasupply.ai/terms` | Approved copy deployed and verified on 2026-07-26     |
| Future production  | `https://www.chinasupply.ai/privacy`     | `https://www.chinasupply.ai/terms`     | Reserved for M5-T9; not accessed or deployed by M3-T7 |

The path suffixes are fixed public interfaces for M4 Preview and later production cutover. They do not use environment-specific slugs or redirects.

## Company disclosure source

The company facts were rechecked on 2026-07-26 against the official [Companies House record for company 17241958](https://find-and-update.company-information.service.gov.uk/company/17241958):

- Legal name: `HUANG SOURCING LTD`
- Company number: `17241958`
- Registered office: `61 Bridge Street, Kington, United Kingdom, HR5 3DJ`
- Company type: Private limited company, registered in England and Wales
- Current registry status: Active
- Current SIC: `99999 - Dormant Company`

Both pages display the legal name, company number, registered office, place of registration, and `Ltd` status in line with the [GOV.UK website disclosure requirements](https://www.gov.uk/running-a-limited-company/signs-stationery-and-promotional-material). The Owner designated `huang.sourcing@gmail.com` as the public contact address on 2026-07-26.

The dormant SIC does not block a staging technical review. Before production, the Owner must confirm the intended operating and filing position with an accountant or legal adviser.

## Drafting basis and confirmed product choices

The Privacy Policy follows the [ICO right-to-be-informed checklist](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/checklists/) as its disclosure baseline and reflects the frozen PRD's actual account deletion, analytics consent, public directory, service-provider, and international-transfer behavior.

The Owner-authorized drafting choices for this task are:

- global privacy baseline, including UK/EEA and applicable US state rights;
- public contact `huang.sourcing@gmail.com`;
- England and Wales governing law and courts, with no arbitration clause;
- aggregate contractual liability cap of `£100`, subject to mandatory legal carve-outs;
- paid sourcing services on `huangsourcing.com` remain governed by separate terms.

Agent drafting does not replace Owner or lawyer review.

## Human approval gate

- [x] Owner reviewed the exact English text and stated “已审阅，批准，请继续” on 2026-07-26. The approval of commit `41d203328e3fddac09e6629ac5e91791e7994cd7` is preserved in [PR #58's approval record](https://github.com/huangsourcing-ux/supplyai/pull/58#issuecomment-5086252123).
- [x] No legal-copy change was made after the approved commit; PR #58 retained the same head SHA through merge.
- [x] PR #58's CI Gate, lint/typecheck/unit, Build, API e2e, Web Playwright, and Vercel Preview all succeeded for the approved commit.

The approval gate was satisfied before PR #58 was marked ready and merged. M3-T6 status is independent and was not changed by this task.

## Canonical staging acceptance evidence

- [x] Approved PR #58 merged to `main` as `09f8325048446e78f77b586fa571275b2a009809` after the Owner gate above.
- [x] Exact-commit [main CI run 30228435413](https://github.com/huangsourcing-ux/supplyai/actions/runs/30228435413) passed CI Gate, CMS migration, Core migration, and Staging Release Gate. Vercel deployment `dpl_8KnMsdcVHuTd7kUWvq2oG8HcN1Ls` reached `READY` with Production target and aliases including `staging.chinasupply.ai`.
- [x] `https://staging.chinasupply.ai/privacy` returned HTTP 200 without a `Location` header and had `Privacy Policy | ChinaSupply.AI`, the approved update date, company disclosure, contact, section links, Terms link, and map return link.
- [x] `https://staging.chinasupply.ai/terms` returned HTTP 200 without a `Location` header and had `Terms of Use | ChinaSupply.AI`, the approved update date, company disclosure, contact, section links, Privacy link, `£100` term, and map return link.
- [x] Canonical staging `/sign-in` returned HTTP 200 and exposed one `/terms` link and one `/privacy` link; Playwright verified both link labels and hrefs.
- [x] A clean Chromium context verified that both the first-visit Consent banner and reopened Analytics settings expose `Read the Privacy Policy` with `href=/privacy`.

Commands and results recorded on 2026-07-26 (America/New_York):

```bash
PLAYWRIGHT_STAGING_BASE_URL=https://staging.chinasupply.ai pnpm test:web:e2e:staging -- legal-pages.spec.ts
# 4/4 passed: the three legal/registration cases plus the existing staging map smoke selected by the repository script

curl -D <headers> -o <body> https://staging.chinasupply.ai/privacy
# HTTP/2 200; no Location; exact Privacy title, company, and email present

curl -D <headers> -o <body> https://staging.chinasupply.ai/terms
# HTTP/2 200; no Location; exact Terms title, company, and email present
```

No production deployment or production URL smoke was performed. Production remains reserved for M5-T9; `/about` and sitemap remain M5-T7.

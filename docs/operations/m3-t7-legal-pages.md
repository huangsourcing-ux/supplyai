# M3-T7 legal pages release record

> Status: **Draft implementation — Owner legal approval and canonical staging verification pending**
>
> Last updated: 2026-07-26
>
> Scope: F-11.1 `/privacy` and `/terms` for staging only. Production, `/about`, sitemap, API, database, Payload, and Mobile are out of scope.

## Stable routes and environments

| Environment        | Privacy Policy                           | Terms of Use                           | State                                                 |
| ------------------ | ---------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| Local / PR fixture | `/privacy`                               | `/terms`                               | Automated verification in M3-T7                       |
| Canonical staging  | `https://staging.chinasupply.ai/privacy` | `https://staging.chinasupply.ai/terms` | Pending merge and staging release gate                |
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

- [ ] Owner has reviewed the exact English text in the M3-T7 PR and explicitly approved it in a PR comment.
- [ ] Any requested legal edits are committed to the same PR and re-approved.
- [ ] CI Gate is green for the exact approved commit.

Until all three statements are true, the PR must remain Draft, must not be merged or deployed, and M3-T7 must remain unchecked. M3-T6 status is independent and must not change in this task.

## Canonical staging acceptance evidence

- [ ] The approved PR is merged only after the Owner gate above.
- [ ] The `main` staging release gate and Vercel deployment complete successfully.
- [ ] `https://staging.chinasupply.ai/privacy` returns HTTP 200 without an authentication redirect and has the approved title, last-updated date, company disclosure, contact, section links, Terms link, and map return link.
- [ ] `https://staging.chinasupply.ai/terms` returns HTTP 200 without an authentication redirect and has the approved title, last-updated date, company disclosure, contact, section links, Privacy link, `£100` term, and map return link.
- [ ] The canonical staging `/sign-in` page links to both fixed legal routes.
- [ ] The Consent banner/settings Privacy link is verified on canonical staging.

Planned command after an approved merge:

```bash
PLAYWRIGHT_STAGING_BASE_URL=https://staging.chinasupply.ai pnpm test:web:e2e:staging -- legal-pages.spec.ts
```

No staging result is claimed in the implementation PR. A same-task acceptance commit/PR must replace this pending section with the actual date, deployed commit, commands, HTTP results, and Playwright result before M3-T7 is checked.

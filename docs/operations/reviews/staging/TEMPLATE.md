# M2 staging smoke review record template

Copy this file to `YYYY-MM-DD-m2-smoke.md` for an actual review. Do not mark
items complete until an authorized reviewer, distinct from the original data
entry author, has checked the evidence in
[`data-verification-sop.md`](../../data-verification-sop.md). This record is for
staging only and does not authorize production changes.

## Review ownership

- Initial data author:
- Independent reviewer:
- Review started at (UTC):
- Review completed at (UTC):
- Staging Web URL:
- Staging API URL:

## Industrial cluster 1

- slug:
- source URL + accessedAt:
- Chinese and English name evidence:
- WGS-84 centroid evidence:
- WGS-84 boundary source, license, query and object ID:
- boundary visual check:
- main products/categories:
- linked factory slugs (exactly 5):
- reviewer:
- reviewedAt (UTC):
- result: pass | reject
- rejection/fix notes:

## Industrial cluster 2

- slug:
- source URL + accessedAt:
- Chinese and English name evidence:
- WGS-84 centroid evidence:
- WGS-84 boundary source, license, query and object ID:
- boundary visual check:
- main products/categories:
- linked factory slugs (exactly 5):
- reviewer:
- reviewedAt (UTC):
- result: pass | reject
- rejection/fix notes:

## Factory reviews

Repeat this block for each of the 10 candidate factories. Replace any rejected
record; do not relax the SOP or publish it to meet the target count.

### Factory 01

- slug:
- cluster slug:
- source URL + accessedAt:
- manufacturer evidence:
- Chinese name/address:
- English name/address:
- WGS-84 coordinate query + object ID:
- coordinate visual check (must be factory/factory grounds, not an
  administrative or town center):
- main products/categories:
- contact check:
- reviewer:
- reviewedAt (UTC):
- `/ops` verifiedBy/verifiedAt/lastVerifiedAt:
- result: pass | reject
- rejection/fix notes:

## Staged publication smoke

Publish only through `/ops`; never use SQL, seed, import, or a temporary script
to set verification or publication state.

### Phase 1 — one cluster and three factories

- published cluster slug:
- published factory slugs:
- publication time (UTC):
- MAP cache purge result:
- MAP-1 cluster count/result:
- MAP-2 boundary result:
- MAP-3 factory count/result:
- A-2/A-5 card detail result:
- A-6 name and main-product search result:
- draft/unverified isolation result:
- reviewer notes:

### Phase 2 — two clusters and ten factories

- published cluster slugs:
- published factory slugs:
- publication time (UTC):
- MAP cache purge result:
- MAP-1 returns exactly 2 reviewed cluster points:
- MAP-2 returns both reviewed real boundaries:
- MAP-3 returns exactly 10 reviewed factory points:
- A-2/A-5 result:
- A-6 result:
- draft/unverified isolation result:
- no-image placeholder result:
- reviewer notes:

## State convergence

- entity slug used for the unpublish test:
- unpublish time (UTC):
- absent from public list:
- absent from search:
- absent from MAP endpoints:
- republish time (UTC):
- restored to public list:
- restored to search:
- restored to MAP endpoints:
- repeated action/cache purge retry result:

## Gate decision

- [ ] Two industrial clusters passed, each with a confirmed WGS-84 boundary.
- [ ] Ten manufacturing factories passed, five linked to each cluster.
- [ ] Every factory contains the expected ADM-5 verification audit fields.
- [ ] Phase 1 and Phase 2 publication smoke checks passed.
- [ ] Draft and unverified records remained absent from public APIs.
- [ ] Unpublish and republish convergence passed.
- [ ] M2-T1b/T1c staging map and card checks passed.
- Decision: pass | reject
- Decision owner:
- Decision time (UTC):
- Open issues:

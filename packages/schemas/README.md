# @chinasupply/schemas

Shared Zod contracts. M0-T5c establishes the stable G-2 localized-text export;
M1-T1 adds strict JSONB value schemas and the single `buildSearchText` entry
point used by future create, update, import, and regeneration paths. Complete
business API request/response contracts begin in M1-T2.

`clusterStatsSchema` deliberately excludes `factoryCount`; callers calculate
that value from factories at read time.

The package exports TypeScript source directly so Metro and EAS can consume it
through the pnpm workspace without a package prebuild.

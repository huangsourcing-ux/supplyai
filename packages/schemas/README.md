# @chinasupply/schemas

Shared Zod contracts and the only source for V1 API wire shapes.

M1-T2 covers every A-1 through A-11, MAP-1 through MAP-3, and ADM-1 through
ADM-6 path/query/body/response contract. Modules expose reusable primitives,
strict WGS-84 GeoJSON, envelope factories, the opaque cursor codec, public and
Admin entity DTOs, account contracts, map FeatureCollections, upload presign
contracts, and the minimal Clerk webhook union. TypeScript types are inferred
from the exported schemas.

Public contracts use English scalar content except the bilingual A-5 factory
address required by F-4.1. Admin contracts retain the frozen `{en, zh}` data
shape. Public media contains resolved CDN URLs; raw object keys only appear in
Admin contracts.

`clusterStatsSchema` deliberately excludes `factoryCount`; callers calculate
that value from factories at read time.

The package exports TypeScript source directly so Metro and EAS can consume it
through the pnpm workspace without a package prebuild.

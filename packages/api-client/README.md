# @chinasupply/api-client

Generated fetch functions and TanStack Query hooks for the ChinaSupply.AI API.
Run `pnpm api:generate` from the repository root after changing a Zod contract
or its HTTP route metadata. Files under `src/generated` are generated and must
not be edited by hand.

The production entry point exports the runtime configuration and generated
client. Contract mocks are available only from `@chinasupply/api-client/mocks`.

Generated request builders return relative paths. The shared fetch mutator
prefixes those paths with the origin derived from
`configureApiClient({ baseUrl })`, keeping the runtime origin outside Orval's
path-parameter encoding while preserving optional deployment path prefixes.

Reserved for OpenAPI and Orval generated output. Generated files must not be edited manually.

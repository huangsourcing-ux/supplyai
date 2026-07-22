# ChinaSupply.AI

ChinaSupply.AI is a pnpm and Turborepo monorepo. Product behavior and implementation scope are governed by the frozen PRD, technology-stack document, development plan, and `AGENTS.md` in this repository.

## Workspace

- `apps/web`: Next.js and Payload application, scheduled for M0-T3
- `apps/mobile`: Expo React Native application, scheduled for M0-T5
- `apps/api`: NestJS API and BullMQ worker, scheduled for M0-T4
- `packages/config`: shared ESLint, TypeScript, and Tailwind configuration
- `packages/schemas`: shared Zod contracts
- `packages/api-client`: generated API client; generated files must not be edited manually
- `packages/geo`: coordinate and navigation utilities
- `packages/i18n`: shared localization resources
- `packages/analytics`: consent-aware analytics facade

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

Application scaffolds are intentionally not included in M0-T1. They are introduced by their dedicated M0 task packages.

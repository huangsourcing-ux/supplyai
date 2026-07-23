# ChinaSupply.AI mobile

This directory contains the Expo Development Build application established by
M0-T5a from Obytes Starter v9.0.0.

The current milestone intentionally contains only the application shell. The
MapLibre native spike belongs to M0-T5b; Clerk, shared package imports, and EAS
Preview configuration belong to M0-T5c.

## Commands

Run from the repository root:

```bash
pnpm --filter @chinasupply/mobile start
pnpm mobile:check
```

`pnpm mobile:check` runs Expo Doctor, TypeScript, Expo public configuration,
and iOS/Android export-bundle checks. It does not compile native projects or
prove that an EAS build succeeds.

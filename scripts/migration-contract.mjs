export const MIGRATION_TARGETS = Object.freeze({
  core: Object.freeze({
    command: "pnpm",
    args: Object.freeze(["--filter", "@chinasupply/api", "db:migrate"]),
    owner: "Drizzle/NestJS",
  }),
  cms: Object.freeze({
    command: "pnpm",
    args: Object.freeze(["--filter", "@chinasupply/web", "cms:migrate"]),
    owner: "Payload",
  }),
});

/** @typedef {keyof typeof MIGRATION_TARGETS} MigrationTarget */

/**
 * @param {string | undefined} target
 * @returns {(typeof MIGRATION_TARGETS)[MigrationTarget]}
 */
export function getMigrationCommand(target) {
  if (!target || !Object.hasOwn(MIGRATION_TARGETS, target)) {
    throw new Error("Migration target must be one of: core, cms");
  }

  return MIGRATION_TARGETS[/** @type {MigrationTarget} */ (target)];
}

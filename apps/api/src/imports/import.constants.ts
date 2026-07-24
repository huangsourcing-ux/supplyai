import type { ImportEntity, ImportJobName } from "@chinasupply/schemas";

export const IMPORT_QUEUE = "data-imports";

export const IMPORT_JOB_BY_ENTITY: Record<ImportEntity, ImportJobName> = {
  clusters: "import:clusters",
  factories: "import:factories",
};

export const IMPORT_JOB_ATTEMPTS = 3;

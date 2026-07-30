import * as migration_20260722_092558_initial_cms from "./20260722_092558_initial_cms";
import * as migration_20260730_124217 from "./20260730_124217";

export const migrations = [
  {
    up: migration_20260722_092558_initial_cms.up,
    down: migration_20260722_092558_initial_cms.down,
    name: "20260722_092558_initial_cms",
  },
  {
    up: migration_20260730_124217.up,
    down: migration_20260730_124217.down,
    name: "20260730_124217",
  },
];

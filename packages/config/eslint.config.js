import globals from "globals";

import { baseConfig } from "./eslint/base.js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default config;

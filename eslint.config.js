import { baseConfig } from "@chinasupply/config/eslint/base";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default config;

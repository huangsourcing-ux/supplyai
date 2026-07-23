import { baseConfig } from "@chinasupply/config/eslint/base";
import globals from "globals";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [".expo/**", "android/**", "coverage/**", "ios/**"],
  },
];

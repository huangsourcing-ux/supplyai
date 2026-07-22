import { workspaceConfig } from "@chinasupply/config/eslint/base";
import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  ...workspaceConfig,
  {
    ignores: [
      ".next/**",
      "src/app/(payload)/admin/importMap.js",
      "src/payload-types.ts",
    ],
  },
];

export default config;

import baseConfig from "@chinasupply/config/eslint/base";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

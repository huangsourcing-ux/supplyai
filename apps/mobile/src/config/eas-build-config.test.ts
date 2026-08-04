import { readFileSync } from "node:fs";
import path from "node:path";

interface MobilePackageJson {
  scripts?: Record<string, string>;
}

describe("EAS build configuration", () => {
  const packageJson = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"),
  ) as MobilePackageJson;

  it("builds the compiled schemas package before EAS eager bundling", () => {
    expect(packageJson.scripts?.["eas-build-post-install"]).toBe(
      "pnpm --filter @chinasupply/schemas build",
    );
  });

  it("owns the non-interactive waiting flags in the preview script", () => {
    expect(packageJson.scripts?.["eas:preview"]).toBe(
      "npx eas-cli@21.1.0 build --platform android --profile preview --non-interactive --wait",
    );
  });
});

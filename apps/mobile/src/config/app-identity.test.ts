import { getMobileIdentity } from "./app-identity";

describe("mobile application identity", () => {
  it.each([
    ["local", "ai.chinasupply.app.local", "chinasupply.local"],
    ["staging", "ai.chinasupply.app.staging", "chinasupply.staging"],
    ["production", "ai.chinasupply.app", "chinasupply"],
  ] as const)(
    "uses the expected %s identifiers",
    (environment, expectedIdentifier, expectedScheme) => {
      const identity = getMobileIdentity(environment);

      expect(identity.bundleIdentifier).toBe(expectedIdentifier);
      expect(identity.androidPackage).toBe(expectedIdentifier);
      expect(identity.scheme).toBe(expectedScheme);
    },
  );
});

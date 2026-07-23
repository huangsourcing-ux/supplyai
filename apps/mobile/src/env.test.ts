import { buildMobileEnvironment } from "./env";

describe("mobile environment", () => {
  it("uses safe local defaults for static tooling", () => {
    expect(buildMobileEnvironment({}).EXPO_PUBLIC_APP_ENV).toBe("local");
  });

  it("rejects private server variables", () => {
    expect(() =>
      buildMobileEnvironment({ DATABASE_URL: "postgresql://private" }),
    ).toThrow(/DATABASE_URL/);
  });
});

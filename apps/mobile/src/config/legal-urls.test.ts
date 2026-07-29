import { getMobileLegalUrls } from "./legal-urls";

describe("mobile legal URLs", () => {
  it.each(["local", "staging"] as const)(
    "uses canonical staging pages in %s",
    (environment) => {
      expect(getMobileLegalUrls(environment)).toEqual({
        accountDeletion:
          "https://staging.chinasupply.ai/privacy#retention-and-account-deletion",
        privacy: "https://staging.chinasupply.ai/privacy",
        terms: "https://staging.chinasupply.ai/terms",
      });
    },
  );

  it("uses canonical public pages in production", () => {
    expect(getMobileLegalUrls("production")).toEqual({
      accountDeletion:
        "https://www.chinasupply.ai/privacy#retention-and-account-deletion",
      privacy: "https://www.chinasupply.ai/privacy",
      terms: "https://www.chinasupply.ai/terms",
    });
  });
});

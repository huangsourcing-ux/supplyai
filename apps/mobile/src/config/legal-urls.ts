import type { MobileEnvironment } from "./app-identity";

export interface MobileLegalUrls {
  accountDeletion: string;
  privacy: string;
  terms: string;
}

export function getMobileLegalUrls(
  environment: MobileEnvironment,
): MobileLegalUrls {
  const origin =
    environment === "production"
      ? "https://www.chinasupply.ai"
      : "https://staging.chinasupply.ai";
  const privacy = `${origin}/privacy`;

  return {
    accountDeletion: `${privacy}#retention-and-account-deletion`,
    privacy,
    terms: `${origin}/terms`,
  };
}

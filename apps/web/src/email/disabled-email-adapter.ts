import type { EmailAdapter } from "payload";

/**
 * M0-T3 does not connect an email provider. Failing closed prevents Payload's
 * development fallback from printing password-reset messages and tokens.
 */
export const disabledEmailAdapter: EmailAdapter = () => ({
  defaultFromAddress: "no-reply@localhost.invalid",
  defaultFromName: "ChinaSupply.AI CMS",
  name: "disabled",
  sendEmail: async () => {
    throw new Error("CMS_EMAIL_DELIVERY_NOT_CONFIGURED");
  },
});

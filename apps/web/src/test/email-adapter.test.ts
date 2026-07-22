import { describe, expect, it } from "vitest";

import { disabledEmailAdapter } from "../email/disabled-email-adapter";

describe("CMS email boundary", () => {
  it("fails closed while no provider is configured", async () => {
    const adapter = disabledEmailAdapter({ payload: {} as never });

    await expect(
      adapter.sendEmail({
        subject: "Password reset",
        text: "sensitive reset token",
        to: "admin@example.invalid",
      }),
    ).rejects.toThrow("CMS_EMAIL_DELIVERY_NOT_CONFIGURED");
  });
});

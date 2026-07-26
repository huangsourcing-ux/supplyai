import type { ClerkWebhookEvent } from "@chinasupply/schemas";
import { describe, expect, it } from "vitest";

import {
  formatClerkName,
  getPrimaryEmail,
} from "../src/webhooks/webhooks.service.js";

const userEvent = {
  object: "event",
  instance_id: "ins_test",
  timestamp: 1785081600000,
  type: "user.created",
  data: {
    email_addresses: [
      { email_address: "secondary@example.test", id: "idn_secondary" },
      { email_address: "buyer@example.test", id: "idn_primary" },
    ],
    first_name: "Ada",
    id: "user_test",
    last_name: "Lovelace",
    primary_email_address_id: "idn_primary",
  },
} satisfies Extract<ClerkWebhookEvent, { type: "user.created" }>;

describe("Clerk webhook mapping", () => {
  it("selects the declared primary email rather than array position", () => {
    expect(getPrimaryEmail(userEvent)).toBe("buyer@example.test");
  });

  it("normalizes Clerk names and preserves a null empty name", () => {
    expect(formatClerkName(" Ada ", " Lovelace ")).toBe("Ada Lovelace");
    expect(formatClerkName("Ada", null)).toBe("Ada");
    expect(formatClerkName(null, null)).toBeNull();
    expect(formatClerkName("", " ")).toBeNull();
  });
});

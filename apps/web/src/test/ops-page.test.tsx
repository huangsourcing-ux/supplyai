import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => `translated:${key}`),
}));

vi.mock("@/auth/require-ops-admin", () => ({
  requireOpsAdmin: vi.fn(async () => ({ userId: "user_admin_reviewer" })),
}));

import OperationsPage from "../app/(frontend)/ops/page";

describe("operations Server Component boundary", () => {
  it("passes only serializable labels to the client dashboard", async () => {
    const page = await OperationsPage();
    const labels = page.props.labels;

    expect(JSON.parse(JSON.stringify(labels))).toEqual(labels);
  });
});

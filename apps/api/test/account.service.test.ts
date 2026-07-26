import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { AccountService } from "../src/account/account.service.js";
import type { DatabaseService } from "../src/database/database.service.js";

describe("AccountService Clerk deletion", () => {
  it("requests deletion for the authenticated Clerk subject", async () => {
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    const service = new AccountService({} as DatabaseService, deleteUser);

    await expect(service.delete("user_account")).resolves.toEqual({
      deletionRequested: true,
    });
    expect(deleteUser).toHaveBeenCalledExactlyOnceWith("user_account");
  });

  it("maps provider failures to a safe service-unavailable response", async () => {
    const service = new AccountService(
      {} as DatabaseService,
      vi.fn().mockRejectedValue(new Error("private provider detail")),
    );

    await expect(service.delete("user_account")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

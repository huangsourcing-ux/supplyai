import { describe, expect, it, vi } from "vitest";

import {
  assertClerkUserSyncEnvironment,
  CLERK_USER_PAGE_LIMIT,
  fetchClerkUsers,
  prepareClerkUserRows,
  type ClerkUserSnapshot,
} from "../src/users/sync-clerk-users.js";

function userSnapshot(
  id: string,
  input: Partial<ClerkUserSnapshot> = {},
): ClerkUserSnapshot {
  return {
    emailAddresses: [{ emailAddress: `${id}@example.test`, id: `email_${id}` }],
    firstName: "Ada",
    id,
    lastName: "Lovelace",
    primaryEmailAddressId: `email_${id}`,
    ...input,
  };
}

describe("M3-T3 Clerk user sync environment guard", () => {
  it("rejects production and unknown environments", () => {
    expect(() =>
      assertClerkUserSyncEnvironment("production", ["--confirm-staging"]),
    ).toThrow("Clerk user sync is forbidden in production");
    expect(() => assertClerkUserSyncEnvironment(undefined, [])).toThrow(
      "Clerk user sync requires APP_ENV=local or APP_ENV=staging",
    );
  });

  it("requires the exact staging confirmation", () => {
    expect(() => assertClerkUserSyncEnvironment("staging", [])).toThrow(
      "Staging Clerk user sync requires the exact --confirm-staging argument",
    );
    expect(() =>
      assertClerkUserSyncEnvironment("staging", [
        "--confirm-staging",
        "--unexpected",
      ]),
    ).toThrow(
      "Staging Clerk user sync requires the exact --confirm-staging argument",
    );
    expect(() =>
      assertClerkUserSyncEnvironment("staging", ["--confirm-staging"]),
    ).not.toThrow();
  });

  it("allows local without confirmation arguments only", () => {
    expect(() => assertClerkUserSyncEnvironment("local", [])).not.toThrow();
    expect(() =>
      assertClerkUserSyncEnvironment("local", ["--confirm-staging"]),
    ).toThrow("Local Clerk user sync does not accept confirmation arguments");
  });
});

describe("M3-T3 Clerk user collection and mapping", () => {
  it("paginates with the maximum Clerk page size and stable ordering", async () => {
    const firstPage = Array.from(
      { length: CLERK_USER_PAGE_LIMIT },
      (_, index) => userSnapshot(`user_${index}`),
    );
    const lastUser = userSnapshot("user_last");
    const getUserList = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage, totalCount: 501 })
      .mockResolvedValueOnce({ data: [lastUser], totalCount: 501 });

    const result = await fetchClerkUsers({ users: { getUserList } });

    expect(getUserList).toHaveBeenNthCalledWith(1, {
      limit: 500,
      offset: 0,
      orderBy: "+created_at",
    });
    expect(getUserList).toHaveBeenNthCalledWith(2, {
      limit: 500,
      offset: 500,
      orderBy: "+created_at",
    });
    expect(result).toHaveLength(501);
    expect(result.at(-1)?.id).toBe("user_last");
  });

  it("uses the declared primary email and normalizes an optional name", () => {
    const rows = prepareClerkUserRows([
      userSnapshot("user_mapped", {
        emailAddresses: [
          { emailAddress: "secondary@example.test", id: "secondary" },
          { emailAddress: "primary@example.test", id: "primary" },
        ],
        firstName: " Ada ",
        lastName: " Lovelace ",
        primaryEmailAddressId: "primary",
      }),
      userSnapshot("user_unnamed", {
        firstName: null,
        lastName: " ",
      }),
    ]);

    expect(rows).toEqual([
      {
        email: "primary@example.test",
        id: "user_mapped",
        name: "Ada Lovelace",
      },
      {
        email: "user_unnamed@example.test",
        id: "user_unnamed",
        name: null,
      },
    ]);
  });

  it("rejects the entire batch without exposing user data", () => {
    const sensitiveEmail = "private-buyer@example.test";
    const sensitiveId = "user_sensitive_identifier";

    expect(() =>
      prepareClerkUserRows([
        userSnapshot(sensitiveId, {
          emailAddresses: [
            { emailAddress: sensitiveEmail, id: "unrelated_email" },
          ],
          primaryEmailAddressId: "missing_email",
        }),
      ]),
    ).toThrow("1 user(s) do not have a primary email");

    try {
      prepareClerkUserRows([
        userSnapshot(sensitiveId, {
          emailAddresses: [
            { emailAddress: sensitiveEmail, id: "unrelated_email" },
          ],
          primaryEmailAddressId: "missing_email",
        }),
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(sensitiveEmail);
      expect((error as Error).message).not.toContain(sensitiveId);
    }
  });
});

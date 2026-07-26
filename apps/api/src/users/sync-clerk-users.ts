import type { CoreDatabase } from "../database/database.service.js";
import { users } from "../database/schema.js";
import {
  formatClerkName,
  getPrimaryEmail,
  type ClerkUserProfileInput,
} from "./clerk-user-profile.js";

export const CLERK_USER_PAGE_LIMIT = 500;

export interface ClerkUserSnapshot {
  emailAddresses: readonly { emailAddress: string; id: string }[];
  firstName: string | null;
  id: string;
  lastName: string | null;
  primaryEmailAddressId: string | null;
}

export interface ClerkUserListSource {
  users: {
    getUserList: (input: {
      limit: number;
      offset: number;
      orderBy: "+created_at";
    }) => Promise<{
      data: ClerkUserSnapshot[];
      totalCount: number;
    }>;
  };
}

export interface ClerkUserSyncResult {
  existing: number;
  fetched: number;
  inserted: number;
}

export function assertClerkUserSyncEnvironment(
  appEnvironment: string | undefined,
  argumentsList: string[],
): asserts appEnvironment is "local" | "staging" {
  if (appEnvironment === "production") {
    throw new Error("Clerk user sync is forbidden in production");
  }
  if (appEnvironment === "staging") {
    if (
      argumentsList.length !== 1 ||
      argumentsList[0] !== "--confirm-staging"
    ) {
      throw new Error(
        "Staging Clerk user sync requires the exact --confirm-staging argument",
      );
    }
    return;
  }
  if (appEnvironment === "local") {
    if (argumentsList.length !== 0) {
      throw new Error(
        "Local Clerk user sync does not accept confirmation arguments",
      );
    }
    return;
  }
  throw new Error("Clerk user sync requires APP_ENV=local or APP_ENV=staging");
}

export async function fetchClerkUsers(
  clerk: ClerkUserListSource,
): Promise<ClerkUserSnapshot[]> {
  const usersById = new Map<string, ClerkUserSnapshot>();
  let offset = 0;

  while (true) {
    const page = await clerk.users.getUserList({
      limit: CLERK_USER_PAGE_LIMIT,
      offset,
      orderBy: "+created_at",
    });
    for (const user of page.data) {
      usersById.set(user.id, user);
    }

    if (page.data.length === 0) {
      break;
    }
    offset += page.data.length;
    if (offset >= page.totalCount) {
      break;
    }
  }

  return [...usersById.values()];
}

function toProfileInput(user: ClerkUserSnapshot): ClerkUserProfileInput {
  return {
    emailAddresses: user.emailAddresses,
    firstName: user.firstName,
    lastName: user.lastName,
    primaryEmailAddressId: user.primaryEmailAddressId,
  };
}

export function prepareClerkUserRows(
  clerkUsers: readonly ClerkUserSnapshot[],
): (typeof users.$inferInsert)[] {
  const prepared = clerkUsers.map((user) => {
    const profile = toProfileInput(user);
    return {
      email: getPrimaryEmail(profile),
      user,
    };
  });
  const invalidPrimaryEmailCount = prepared.filter(
    ({ email }) => email === null,
  ).length;

  if (invalidPrimaryEmailCount > 0) {
    throw new Error(
      `Clerk user sync aborted: ${invalidPrimaryEmailCount} user(s) do not have a primary email`,
    );
  }

  return prepared.map(({ email, user }) => ({
    email: email as string,
    id: user.id,
    name: formatClerkName(user.firstName, user.lastName),
  }));
}

export async function syncClerkUsers(input: {
  clerk: ClerkUserListSource;
  database: CoreDatabase;
}): Promise<ClerkUserSyncResult> {
  const clerkUsers = await fetchClerkUsers(input.clerk);
  const rows = prepareClerkUserRows(clerkUsers);
  let inserted = 0;

  if (rows.length > 0) {
    await input.database.transaction(async (transaction) => {
      for (
        let offset = 0;
        offset < rows.length;
        offset += CLERK_USER_PAGE_LIMIT
      ) {
        const insertedRows = await transaction
          .insert(users)
          .values(rows.slice(offset, offset + CLERK_USER_PAGE_LIMIT))
          .onConflictDoNothing({ target: users.id })
          .returning({ id: users.id });
        inserted += insertedRows.length;
      }
    });
  }

  return {
    existing: clerkUsers.length - inserted,
    fetched: clerkUsers.length,
    inserted,
  };
}

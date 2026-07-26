import { createClerkClient } from "@clerk/backend";

import type { RuntimeConfig } from "../config/runtime-config.module.js";

export const CLERK_USER_DELETER = Symbol("CLERK_USER_DELETER");

export type ClerkUserDeleter = (userId: string) => Promise<void>;

export function createClerkUserDeleter(
  config: RuntimeConfig,
): ClerkUserDeleter {
  if (config.CLERK_SECRET_KEY === undefined) {
    return () => Promise.reject(new Error("Clerk deletion is unavailable"));
  }

  const clerk = createClerkClient({
    secretKey: config.CLERK_SECRET_KEY,
    telemetry: { disabled: true },
  });
  return async (userId) => {
    await clerk.users.deleteUser(userId);
  };
}

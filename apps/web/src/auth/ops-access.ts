import { hasAdminRole } from "./admin-role";

export type OpsAccessDecision = "allow" | "forbidden" | "sign-in";

export function decideOpsAccess(
  userId: string | null | undefined,
  sessionClaims: unknown,
): OpsAccessDecision {
  if (!userId) {
    return "sign-in";
  }

  return hasAdminRole(sessionClaims) ? "allow" : "forbidden";
}

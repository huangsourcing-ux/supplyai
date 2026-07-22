import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { decideOpsAccess } from "./ops-access";
import { OPS_FORBIDDEN_PATH, OPS_SIGN_IN_PATH } from "./ops-routes";

export async function requireOpsAdmin(): Promise<{ userId: string }> {
  const { sessionClaims, userId } = await auth();

  const decision = decideOpsAccess(userId, sessionClaims);

  if (decision === "sign-in") {
    redirect(OPS_SIGN_IN_PATH);
  }

  if (decision === "forbidden") {
    redirect(OPS_FORBIDDEN_PATH);
  }

  return { userId: userId! };
}

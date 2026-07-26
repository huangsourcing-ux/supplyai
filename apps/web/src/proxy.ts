import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { decideOpsAccess } from "./auth/ops-access";
import {
  isProtectedOpsPath,
  OPS_FORBIDDEN_PATH,
  OPS_SIGN_IN_PATH,
} from "./auth/ops-routes";

export default clerkMiddleware(async (authentication, request) => {
  if (!isProtectedOpsPath(request.nextUrl.pathname)) {
    return;
  }

  const { sessionClaims, userId } = await authentication();
  const decision = decideOpsAccess(userId, sessionClaims);

  if (decision === "sign-in") {
    const signInUrl = new URL(OPS_SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set(
      "redirect_url",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signInUrl);
  }

  if (decision === "forbidden") {
    return NextResponse.redirect(new URL(OPS_FORBIDDEN_PATH, request.url));
  }
});

export const config = {
  matcher: ["/ops/:path*", "/sign-in/:path*"],
};

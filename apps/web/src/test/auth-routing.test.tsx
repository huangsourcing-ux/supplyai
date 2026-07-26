import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

vi.mock("geist/font/sans", () => ({
  GeistSans: { variable: "font-geist-sans" },
}));

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("next-intl/server", () => ({
  getMessages: vi.fn(async () => ({})),
  getTranslations: vi.fn(async () => (key: string) => `translated:${key}`),
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({
    children,
    signInFallbackRedirectUrl,
    signInUrl,
    signUpFallbackRedirectUrl,
  }: {
    children: React.ReactNode;
    signInFallbackRedirectUrl?: string;
    signInUrl?: string;
    signUpFallbackRedirectUrl?: string;
  }) => (
    <div
      data-provider-fallback={signInFallbackRedirectUrl}
      data-provider-sign-in={signInUrl}
      data-provider-sign-up-fallback={signUpFallbackRedirectUrl}
    >
      {children}
    </div>
  ),
  SignIn: ({
    fallbackRedirectUrl,
    forceRedirectUrl,
    path,
    routing,
    signUpFallbackRedirectUrl,
    withSignUp,
  }: {
    fallbackRedirectUrl?: string;
    forceRedirectUrl?: string;
    path?: string;
    routing?: string;
    signUpFallbackRedirectUrl?: string;
    withSignUp?: boolean;
  }) => (
    <div
      data-fallback={fallbackRedirectUrl}
      data-force={forceRedirectUrl}
      data-path={path}
      data-routing={routing}
      data-sign-up-fallback={signUpFallbackRedirectUrl}
      data-with-sign-up={String(withSignUp)}
    />
  ),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ sessionClaims: undefined, userId: null })),
  clerkMiddleware: vi.fn((handler) => handler),
}));

vi.mock("../app/(frontend)/api-query-provider", () => ({
  ApiQueryProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import FrontendLayout from "../app/(frontend)/layout";
import OperationsSignInPage from "../app/(frontend)/ops/sign-in/[[...sign-in]]/page";
import PublicSignInPage from "../app/(frontend)/sign-in/[[...sign-in]]/page";
import {
  PUBLIC_AUTH_FALLBACK_PATH,
  PUBLIC_SIGN_IN_PATH,
  buildClusterAuthReturnPath,
} from "../auth/public-auth-routes";
import { config as proxyConfig } from "../proxy";

describe("public Clerk routing", () => {
  it("configures the shared provider for the public combined sign-in flow", async () => {
    const markup = renderToStaticMarkup(
      await FrontendLayout({ children: <div>content</div> }),
    );

    expect(markup).toContain('data-provider-sign-in="/sign-in"');
    expect(markup).toContain('data-provider-fallback="/"');
    expect(markup).toContain('data-provider-sign-up-fallback="/"');
  });

  it("runs Clerk middleware only on the two authentication route trees", () => {
    expect(proxyConfig.matcher).toEqual(["/ops/:path*", "/sign-in/:path*"]);
    expect(proxyConfig.matcher).not.toContain("/clusters/:path*");
  });

  it("mounts a combined path-routed sign-in page with home fallbacks", async () => {
    const markup = renderToStaticMarkup(await PublicSignInPage());

    expect(markup).toContain('data-path="/sign-in"');
    expect(markup).toContain('data-routing="path"');
    expect(markup).toContain('data-fallback="/"');
    expect(markup).toContain('data-sign-up-fallback="/"');
    expect(markup).toContain('data-with-sign-up="true"');
  });

  it("keeps the operations sign-in force-redirected to /ops", async () => {
    const markup = renderToStaticMarkup(await OperationsSignInPage());

    expect(markup).toContain('data-path="/ops/sign-in"');
    expect(markup).toContain('data-force="/ops"');
    expect(markup).toContain('data-with-sign-up="false"');
  });

  it("keeps public auth paths and encoded cluster return paths stable", () => {
    expect(PUBLIC_SIGN_IN_PATH).toBe("/sign-in");
    expect(PUBLIC_AUTH_FALLBACK_PATH).toBe("/");
    expect(buildClusterAuthReturnPath("lighting/fixtures")).toBe(
      "/clusters/lighting%2Ffixtures",
    );
  });
});

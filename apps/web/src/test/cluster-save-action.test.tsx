import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

const clerkState = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: false,
  signInButtonProps: undefined as
    | {
        forceRedirectUrl?: string;
        mode?: string;
        signUpForceRedirectUrl?: string;
        withSignUp?: boolean;
      }
    | undefined,
}));

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    forceRedirectUrl?: string;
    mode?: string;
    signUpForceRedirectUrl?: string;
    withSignUp?: boolean;
  }) => {
    clerkState.signInButtonProps = props;
    return React.cloneElement(
      React.Children.only(children) as React.ReactElement<
        Record<string, unknown>
      >,
      { "data-clerk-trigger": "true" },
    );
  },
  useAuth: () => clerkState,
}));

import { ClusterSaveAction } from "../app/(frontend)/clusters/[slug]/cluster-save-action";

const labels = {
  loading: "Checking your sign-in status…",
  pending: "Saving will be connected in the next account step.",
  save: "Save cluster",
  signInHint: "Sign in to save this cluster.",
};

afterEach(() => {
  clerkState.isLoaded = true;
  clerkState.isSignedIn = false;
  clerkState.signInButtonProps = undefined;
});

describe("cluster save authentication boundary", () => {
  it("sends a signed-out user through sign-in and sign-up back to the cluster", () => {
    const markup = renderToStaticMarkup(
      <ClusterSaveAction labels={labels} slug="shenzhen-lighting" />,
    );

    expect(markup).toContain("Sign in to save this cluster.");
    expect(markup).toContain('data-clerk-trigger="true"');
    expect(markup).not.toContain("disabled");
    expect(clerkState.signInButtonProps).toEqual({
      forceRedirectUrl: "/clusters/shenzhen-lighting",
      mode: "redirect",
      signUpForceRedirectUrl: "/clusters/shenzhen-lighting",
      withSignUp: true,
    });
  });

  it("keeps favorites disabled for a signed-in user until M3-T4", () => {
    clerkState.isSignedIn = true;

    const markup = renderToStaticMarkup(
      <ClusterSaveAction labels={labels} slug="shenzhen-lighting" />,
    );

    expect(markup).toContain(labels.pending);
    expect(markup).toContain("disabled");
    expect(clerkState.signInButtonProps).toBeUndefined();
  });

  it("renders a stable disabled state while Clerk loads", () => {
    clerkState.isLoaded = false;

    const markup = renderToStaticMarkup(
      <ClusterSaveAction labels={labels} slug="shenzhen-lighting" />,
    );

    expect(markup).toContain(labels.loading);
    expect(markup).toContain("disabled");
    expect(clerkState.signInButtonProps).toBeUndefined();
  });
});

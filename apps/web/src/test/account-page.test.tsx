// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const authState = vi.hoisted(() => ({
  getRequest: vi.fn(async () => ({
    headers: { Authorization: "Bearer fixture-token" },
  })),
  handleProtectedError: vi.fn(),
  isLoaded: true,
  isSignedIn: true,
  signOutAndClear: vi.fn(),
}));
const userState = vi.hoisted(() => ({
  isLoaded: true,
  user: {
    emailAddresses: [{ emailAddress: "buyer@example.com" }],
    primaryEmailAddress: { emailAddress: "buyer@example.com" },
  } as
    | {
        emailAddresses: Array<{ emailAddress: string }>;
        primaryEmailAddress: { emailAddress: string };
      }
    | undefined,
}));
const updateMeMock = vi.hoisted(() => vi.fn());
const deleteMeMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => userState,
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: {
    mutationFn: () => Promise<unknown>;
    onError?: (error: unknown) => void;
    onSuccess?: (data: unknown) => void | Promise<void>;
  }) => ({
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: () => {
      void options
        .mutationFn()
        .then((data) => options.onSuccess?.(data))
        .catch((error) => options.onError?.(error));
    },
  }),
}));

vi.mock("@chinasupply/api-client", () => ({
  deleteMe: deleteMeMock,
  updateMe: updateMeMock,
}));

vi.mock("../auth/protected-api", () => ({
  useProtectedApi: () => authState,
}));

import { AccountPageClient } from "../app/(frontend)/account/account-page-client";

const labels = {
  cancel: "Keep account",
  deleteAction: "Delete account",
  deleteConfirm: "This cannot be undone.",
  deleteDescription: "Deletion description",
  deleteError: "Delete error",
  deletePending: "Deleting…",
  deleteTitle: "Delete account section",
  description: "Account description",
  emailFallback: "Email unavailable",
  emailLabel: "Email",
  eyebrow: "Buyer account",
  languageDescription: "Language description",
  languageEnglish: "English",
  languageLabel: "Save language",
  languageSaveError: "Save error",
  languageSaved: "Saved",
  languageSaving: "Saving…",
  languageTitle: "Language preference",
  loading: "Loading…",
  signIn: "Sign in",
  signInDescription: "Sign in description",
  signInTitle: "Sign in title",
  signOut: "Sign out",
  signingOut: "Signing out…",
  title: "Account settings",
};

let root: Root | undefined;

async function renderAccount(): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<AccountPageClient labels={labels} />);
  });
  return container;
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (button === undefined) throw new Error(`Button not found: ${label}`);
  return button;
}

async function click(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
}

afterEach(async () => {
  if (root !== undefined) {
    await act(async () => root?.unmount());
  }
  root = undefined;
  document.body.replaceChildren();
  authState.getRequest.mockClear();
  authState.handleProtectedError.mockClear();
  authState.isLoaded = true;
  authState.isSignedIn = true;
  authState.signOutAndClear.mockReset();
  userState.user = {
    emailAddresses: [{ emailAddress: "buyer@example.com" }],
    primaryEmailAddress: { emailAddress: "buyer@example.com" },
  };
  userState.isLoaded = true;
  updateMeMock.mockReset();
  deleteMeMock.mockReset();
});

describe("account page", () => {
  it("shows a signed-out guide without account controls", async () => {
    authState.isSignedIn = false;
    userState.user = undefined;
    const container = await renderAccount();

    expect(container.textContent).toContain(labels.signInTitle);
    expect(container.textContent).not.toContain("buyer@example.com");
    expect(updateMeMock).not.toHaveBeenCalled();
    expect(deleteMeMock).not.toHaveBeenCalled();
  });

  it("displays the Clerk email and saves the frozen English locale", async () => {
    updateMeMock.mockResolvedValue({
      data: {
        email: "buyer@example.com",
        id: "user_fixture",
        locale: "en",
        name: null,
      },
      error: null,
      meta: {},
    });
    const container = await renderAccount();

    expect(container.textContent).toContain("buyer@example.com");
    expect(container.querySelector("select")?.value).toBe("en");
    await click(findButton(container, labels.languageLabel));

    expect(updateMeMock).toHaveBeenCalledWith(
      { locale: "en" },
      { headers: { Authorization: "Bearer fixture-token" } },
    );
  });

  it("requires an inline second confirmation before deleting", async () => {
    deleteMeMock.mockResolvedValue({
      data: { deletionRequested: true },
      error: null,
      meta: {},
    });
    const container = await renderAccount();

    expect(container.textContent).not.toContain(labels.deleteConfirm);
    expect(deleteMeMock).not.toHaveBeenCalled();
    await click(findButton(container, labels.deleteAction));
    expect(container.textContent).toContain(labels.deleteConfirm);
    expect(deleteMeMock).not.toHaveBeenCalled();

    await click(findButton(container, labels.deleteAction));
    expect(deleteMeMock).toHaveBeenCalledWith({
      headers: { Authorization: "Bearer fixture-token" },
    });
    expect(authState.signOutAndClear).toHaveBeenCalledWith();
  });

  it("clears the private session through the shared sign-out path", async () => {
    const container = await renderAccount();
    await click(findButton(container, labels.signOut));

    expect(authState.signOutAndClear).toHaveBeenCalledWith();
  });
});

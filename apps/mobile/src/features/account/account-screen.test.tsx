import { useUser } from "@clerk/expo";
import { deleteMe, updateMe } from "@chinasupply/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useRouter } from "expo-router";

import "../../lib/i18n";
import { useMobileProtectedApi } from "../../lib/mobile-protected-api";
import AccountScreen from "./account-screen";

jest.mock("../../lib/mobile-protected-api", () => ({
  useMobileProtectedApi: jest.fn(),
}));

const getRequest = jest.fn(async () => ({
  headers: { Authorization: "Bearer test-token" },
}));
const handleProtectedError = jest.fn(async () => false);
const signOutAndClear = jest.fn(async () => undefined);
const replace = jest.fn();

function configureSignedInAccount() {
  jest.mocked(useUser).mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: {
      emailAddresses: [{ emailAddress: "secondary@example.com" }],
      primaryEmailAddress: { emailAddress: "buyer@example.com" },
    },
  } as unknown as ReturnType<typeof useUser>);
  jest.mocked(useMobileProtectedApi).mockReturnValue({
    getRequest,
    handleProtectedError,
    isLoaded: true,
    isSignedIn: true,
    signOutAndClear,
  } as unknown as ReturnType<typeof useMobileProtectedApi>);
}

function renderAccount() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccountScreen />
    </QueryClientProvider>,
  );
}

describe("mobile Account tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureSignedInAccount();
    jest.mocked(useRouter).mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(updateMe).mockResolvedValue({} as never);
    jest.mocked(deleteMe).mockResolvedValue({} as never);
  });

  it("shows a clear loading state while Clerk resolves", () => {
    jest.mocked(useMobileProtectedApi).mockReturnValue({
      isLoaded: false,
    } as ReturnType<typeof useMobileProtectedApi>);
    jest.mocked(useUser).mockReturnValue({
      isLoaded: false,
      isSignedIn: undefined,
      user: undefined,
    } as ReturnType<typeof useUser>);

    renderAccount();

    expect(screen.getByTestId("account-loading")).toBeOnTheScreen();
    expect(screen.getByText("Loading your account…")).toBeOnTheScreen();
  });

  it("shows passwordless authentication without blocking the public Map tab", () => {
    jest.mocked(useMobileProtectedApi).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    } as ReturnType<typeof useMobileProtectedApi>);

    renderAccount();

    expect(screen.getByText("Sign in to ChinaSupply.AI")).toBeOnTheScreen();
    expect(screen.queryByText("Password")).toBeNull();
  });

  it("shows the primary Clerk email and saves English through PATCH /me", async () => {
    renderAccount();

    expect(screen.getByTestId("account-email")).toHaveTextContent(
      "buyer@example.com",
    );
    expect(screen.getByText("English")).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("account-save-locale"));

    await waitFor(() => {
      expect(updateMe).toHaveBeenCalledWith(
        { locale: "en" },
        { headers: { Authorization: "Bearer test-token" } },
      );
    });
    expect(
      await screen.findByText("Language preference saved."),
    ).toBeOnTheScreen();
  });

  it("uses shared cleanup for sign-out and returns to public Map", async () => {
    renderAccount();

    fireEvent.press(screen.getByTestId("account-sign-out"));

    await waitFor(() => {
      expect(signOutAndClear).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/");
    });
  });

  it("requires inline confirmation before DELETE /me", async () => {
    renderAccount();

    fireEvent.press(screen.getByTestId("account-delete-start"));
    expect(screen.getByTestId("account-delete-confirmation")).toBeOnTheScreen();
    expect(deleteMe).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("account-delete-cancel"));
    expect(screen.queryByTestId("account-delete-confirmation")).toBeNull();

    fireEvent.press(screen.getByTestId("account-delete-start"));
    fireEvent.press(screen.getByTestId("account-delete-confirm"));

    await waitFor(() => {
      expect(deleteMe).toHaveBeenCalledWith({
        headers: { Authorization: "Bearer test-token" },
      });
      expect(signOutAndClear).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/");
    });
  });

  it("keeps the page open with a localized retry message after DELETE fails", async () => {
    jest
      .mocked(deleteMe)
      .mockRejectedValueOnce(new Error("private API detail"));
    renderAccount();

    fireEvent.press(screen.getByTestId("account-delete-start"));
    fireEvent.press(screen.getByTestId("account-delete-confirm"));

    expect(
      await screen.findByText(
        "Your account could not be deleted. Please try again.",
      ),
    ).toBeOnTheScreen();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([
    ["PATCH", () => fireEvent.press(screen.getByTestId("account-save-locale"))],
    [
      "DELETE",
      () => {
        fireEvent.press(screen.getByTestId("account-delete-start"));
        fireEvent.press(screen.getByTestId("account-delete-confirm"));
      },
    ],
  ])("treats a %s 401 as session expiry", async (method, act) => {
    const unauthorized = Object.assign(new Error("Unauthorized"), {
      status: 401,
    });
    if (method === "PATCH")
      jest.mocked(updateMe).mockRejectedValueOnce(unauthorized);
    else jest.mocked(deleteMe).mockRejectedValueOnce(unauthorized);
    handleProtectedError.mockResolvedValueOnce(true);
    renderAccount();

    act();

    await waitFor(() => {
      expect(handleProtectedError).toHaveBeenCalledWith(unauthorized);
      expect(replace).toHaveBeenCalledWith("/");
    });
  });
});

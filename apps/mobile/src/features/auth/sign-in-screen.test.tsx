import { useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import "../../lib/i18n";
import SignInScreen, {
  getSocialAuthVisibility,
  STAGING_SSO_CALLBACK_URL,
} from "./sign-in-screen";

function createAuthMocks(
  signInStatus:
    "complete" | "needs_client_trust" | "needs_second_factor" = "complete",
) {
  const signIn = {
    create: jest.fn(async () => ({ error: null })),
    emailCode: {
      sendCode: jest.fn(async () => ({ error: null })),
      verifyCode: jest.fn(async () => ({ error: null })),
    },
    finalize: jest.fn(async () => ({ error: null })),
    mfa: {
      sendEmailCode: jest.fn(async () => ({ error: null })),
      verifyEmailCode: jest.fn(async () => ({ error: null })),
    },
    reset: jest.fn(async () => ({ error: null })),
    status: signInStatus,
    supportedSecondFactors:
      signInStatus === "complete" ? [] : [{ strategy: "email_code" as const }],
  };
  const signUp = {
    create: jest.fn(async () => ({ error: null })),
    finalize: jest.fn(async () => ({ error: null })),
    reset: jest.fn(async () => ({ error: null })),
    status: "complete",
    verifications: {
      sendEmailCode: jest.fn(async () => ({ error: null })),
      verifyEmailCode: jest.fn(async () => ({ error: null })),
    },
  };
  const startSSOFlow = jest.fn();
  const startAppleAuthenticationFlow = jest.fn();

  jest.mocked(useSignIn).mockReturnValue({
    fetchStatus: "idle",
    signIn,
  } as unknown as ReturnType<typeof useSignIn>);
  jest.mocked(useSignUp).mockReturnValue({
    fetchStatus: "idle",
    signUp,
  } as unknown as ReturnType<typeof useSignUp>);
  jest.mocked(useSSO).mockReturnValue({ startSSOFlow });
  jest.mocked(useSignInWithApple).mockReturnValue({
    startAppleAuthenticationFlow,
  });

  return { signIn, signUp, startAppleAuthenticationFlow, startSSOFlow };
}

async function requestEmailCode(email = "buyer@example.com") {
  fireEvent.changeText(screen.getByTestId("auth-email"), email);
  fireEvent.press(screen.getByTestId("auth-submit"));
  await screen.findByText("Check your email");
}

describe("Clerk Expo passwordless authentication", () => {
  it("applies the Apple/Google visibility policy on each platform", () => {
    expect(getSocialAuthVisibility("ios", false)).toEqual({
      apple: false,
      google: false,
    });
    expect(getSocialAuthVisibility("ios", true)).toEqual({
      apple: true,
      google: true,
    });
    expect(getSocialAuthVisibility("android", false)).toEqual({
      apple: false,
      google: true,
    });
  });

  it("hides both iOS social providers until Apple is enabled", () => {
    render(<SignInScreen appleSignInEnabled={false} />);

    expect(screen.queryByTestId("auth-apple")).toBeNull();
    expect(screen.queryByTestId("auth-google")).toBeNull();
    expect(screen.getByTestId("auth-email")).toBeOnTheScreen();
  });

  it("shows Apple and Google together when Apple is enabled on iOS", () => {
    render(<SignInScreen appleSignInEnabled />);

    expect(screen.getByTestId("auth-apple")).toBeOnTheScreen();
    expect(screen.getByTestId("auth-google")).toBeOnTheScreen();
  });

  it("shows the matching account-mode switch prompt", () => {
    render(<SignInScreen />);

    expect(
      screen.getByText("New to ChinaSupply.AI? Create an account"),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("auth-switch-mode"));

    expect(
      screen.getByText("Already have an account? Sign in"),
    ).toBeOnTheScreen();
  });

  it("sends and verifies an email sign-in code, then finalizes", async () => {
    const { signIn } = createAuthMocks();
    const onComplete = jest.fn();
    render(<SignInScreen appleSignInEnabled onComplete={onComplete} />);

    await requestEmailCode();
    expect(signIn.create).toHaveBeenCalledWith({
      identifier: "buyer@example.com",
    });
    expect(signIn.emailCode.sendCode).toHaveBeenCalledTimes(1);

    fireEvent.changeText(screen.getByTestId("auth-code"), "424242");
    fireEvent.press(screen.getByTestId("auth-submit"));

    await waitFor(() => {
      expect(signIn.emailCode.verifyCode).toHaveBeenCalledWith({
        code: "424242",
      });
      expect(signIn.finalize).toHaveBeenCalledWith({
        navigate: expect.any(Function),
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("creates an English-locale user and verifies the sign-up email", async () => {
    const { signUp } = createAuthMocks();
    const onComplete = jest.fn();
    render(<SignInScreen appleSignInEnabled onComplete={onComplete} />);

    fireEvent.press(screen.getByTestId("auth-switch-mode"));
    await requestEmailCode("new+clerk_test@example.com");

    expect(signUp.create).toHaveBeenCalledWith({
      emailAddress: "new+clerk_test@example.com",
      locale: "en",
    });
    expect(signUp.verifications.sendEmailCode).toHaveBeenCalledTimes(1);

    fireEvent.changeText(screen.getByTestId("auth-code"), "424242");
    fireEvent.press(screen.getByTestId("auth-submit"));

    await waitFor(() => {
      expect(signUp.verifications.verifyEmailCode).toHaveBeenCalledWith({
        code: "424242",
      });
      expect(signUp.finalize).toHaveBeenCalledWith({
        navigate: expect.any(Function),
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it.each(["needs_client_trust", "needs_second_factor"] as const)(
    "supports the email-code %s step",
    async (status) => {
      const { signIn } = createAuthMocks(status);
      render(<SignInScreen />);

      await requestEmailCode();
      fireEvent.changeText(screen.getByTestId("auth-code"), "424242");
      fireEvent.press(screen.getByTestId("auth-submit"));

      await screen.findByText("Additional verification");
      expect(signIn.mfa.sendEmailCode).toHaveBeenCalledTimes(1);

      signIn.status = "complete";
      fireEvent.changeText(screen.getByTestId("auth-code"), "424242");
      fireEvent.press(screen.getByTestId("auth-submit"));

      await waitFor(() => {
        expect(signIn.mfa.verifyEmailCode).toHaveBeenCalledWith({
          code: "424242",
        });
        expect(signIn.finalize).toHaveBeenCalled();
      });
    },
  );

  it("activates a Google OAuth session with the staging callback", async () => {
    const { startSSOFlow } = createAuthMocks();
    const setActive = jest.fn(async () => undefined);
    const onComplete = jest.fn();
    startSSOFlow.mockResolvedValue({
      authSessionResult: { type: "success" },
      createdSessionId: "session_google",
      setActive,
    });
    render(<SignInScreen appleSignInEnabled onComplete={onComplete} />);

    fireEvent.press(screen.getByTestId("auth-google"));

    await waitFor(() => {
      expect(startSSOFlow).toHaveBeenCalledWith({
        redirectUrl: STAGING_SSO_CALLBACK_URL,
        strategy: "oauth_google",
      });
      expect(setActive).toHaveBeenCalledWith({ session: "session_google" });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("renders an optional native back action for standalone auth", () => {
    const onBack = jest.fn();
    render(<SignInScreen onBack={onBack} />);

    fireEvent.press(screen.getByTestId("auth-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("activates an Apple session and reuses the auth completion callback", async () => {
    const { startAppleAuthenticationFlow } = createAuthMocks();
    const setActive = jest.fn(async () => undefined);
    const onComplete = jest.fn();
    startAppleAuthenticationFlow.mockResolvedValue({
      createdSessionId: "session_apple",
      setActive,
    });
    render(<SignInScreen appleSignInEnabled onComplete={onComplete} />);

    fireEvent.press(screen.getByTestId("auth-apple"));

    await waitFor(() => {
      expect(setActive).toHaveBeenCalledWith({ session: "session_apple" });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("treats a canceled Apple sheet as a no-op", async () => {
    const { startAppleAuthenticationFlow } = createAuthMocks();
    startAppleAuthenticationFlow.mockResolvedValue({
      createdSessionId: null,
    });
    render(<SignInScreen appleSignInEnabled />);

    fireEvent.press(screen.getByTestId("auth-apple"));

    await waitFor(() =>
      expect(startAppleAuthenticationFlow).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.queryByText(
        "Apple sign-in could not be completed. Please try again.",
      ),
    ).toBeNull();
  });

  it("shows a localized Apple error without provider diagnostics", async () => {
    const { startAppleAuthenticationFlow } = createAuthMocks();
    startAppleAuthenticationFlow.mockRejectedValue(
      new Error("private Apple provider diagnostic"),
    );
    render(<SignInScreen appleSignInEnabled />);

    fireEvent.press(screen.getByTestId("auth-apple"));

    expect(
      await screen.findByText(
        "Apple sign-in could not be completed. Please try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("private Apple provider diagnostic")).toBeNull();
  });

  it("treats a canceled Google browser session as a no-op", async () => {
    const { startSSOFlow } = createAuthMocks();
    startSSOFlow.mockResolvedValue({
      authSessionResult: { type: "cancel" },
      createdSessionId: null,
    });
    render(<SignInScreen appleSignInEnabled />);

    fireEvent.press(screen.getByTestId("auth-google"));

    await waitFor(() => expect(startSSOFlow).toHaveBeenCalled());
    expect(
      screen.queryByText(
        "Google sign-in could not be completed. Please try again.",
      ),
    ).toBeNull();
  });

  it("shows localized OAuth and email errors without Clerk diagnostics", async () => {
    const { signIn, startSSOFlow } = createAuthMocks();
    signIn.create.mockResolvedValueOnce({
      error: { longMessage: "private Clerk diagnostic" },
    } as never);
    render(<SignInScreen appleSignInEnabled />);

    fireEvent.changeText(screen.getByTestId("auth-email"), "buyer@example.com");
    fireEvent.press(screen.getByTestId("auth-submit"));
    expect(
      await screen.findByText(
        "Authentication could not be completed. Check your details and try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("private Clerk diagnostic")).toBeNull();

    startSSOFlow.mockRejectedValueOnce(new Error("provider details"));
    fireEvent.press(screen.getByTestId("auth-google"));
    expect(
      await screen.findByText(
        "Google sign-in could not be completed. Please try again.",
      ),
    ).toBeOnTheScreen();
  });
});

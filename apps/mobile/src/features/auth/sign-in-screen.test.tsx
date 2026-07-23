import { useSignIn } from "@clerk/expo";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import "../../lib/i18n";
import SignInScreen from "./sign-in-screen";

function createSignInMock(
  status: "complete" | "needs_client_trust" = "complete",
) {
  const signIn = {
    finalize: jest.fn(async () => ({ error: null })),
    mfa: {
      sendEmailCode: jest.fn(async () => ({ error: null })),
      verifyEmailCode: jest.fn(async () => ({ error: null })),
    },
    password: jest.fn(async () => ({ error: null })),
    status,
    supportedSecondFactors:
      status === "needs_client_trust"
        ? [
            {
              emailAddressId: "email_1",
              safeIdentifier: "m***@e.com",
              strategy: "email_code",
            },
          ]
        : [],
  };

  jest.mocked(useSignIn).mockReturnValue({
    fetchStatus: "idle",
    signIn,
  } as unknown as ReturnType<typeof useSignIn>);

  return signIn;
}

function enterCredentials() {
  fireEvent.changeText(
    screen.getByTestId("sign-in-email"),
    "buyer@example.com",
  );
  fireEvent.changeText(screen.getByTestId("sign-in-password"), "safe-password");
}

describe("Clerk Expo sign-in screen", () => {
  it("submits email/password and finalizes a complete session", async () => {
    const signIn = createSignInMock();
    render(<SignInScreen />);

    enterCredentials();
    fireEvent.press(screen.getByTestId("sign-in-submit"));

    await waitFor(() => {
      expect(signIn.password).toHaveBeenCalledWith({
        emailAddress: "buyer@example.com",
        password: "safe-password",
      });
      expect(signIn.finalize).toHaveBeenCalledWith({
        navigate: expect.any(Function),
      });
    });
  });

  it("handles the email-code client trust step", async () => {
    const signIn = createSignInMock("needs_client_trust");
    render(<SignInScreen />);

    enterCredentials();
    fireEvent.press(screen.getByTestId("sign-in-submit"));

    await screen.findByText("Verify this device");
    expect(signIn.mfa.sendEmailCode).toHaveBeenCalledTimes(1);

    fireEvent.changeText(screen.getByTestId("sign-in-code"), "424242");
    signIn.status = "complete";
    fireEvent.press(screen.getByTestId("sign-in-submit"));

    await waitFor(() => {
      expect(signIn.mfa.verifyEmailCode).toHaveBeenCalledWith({
        code: "424242",
      });
      expect(signIn.finalize).toHaveBeenCalledWith({
        navigate: expect.any(Function),
      });
    });
  });

  it("shows a localized generic error without exposing Clerk details", async () => {
    const signIn = createSignInMock();
    signIn.password.mockResolvedValueOnce({
      error: { longMessage: "private Clerk diagnostic" },
    } as never);
    render(<SignInScreen />);

    enterCredentials();
    fireEvent.press(screen.getByTestId("sign-in-submit"));

    expect(
      await screen.findByText(
        "Sign in could not be completed. Check your details and try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("private Clerk diagnostic")).toBeNull();
  });
});

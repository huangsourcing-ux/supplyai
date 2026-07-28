import { useSignIn, useSignUp, useSSO } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export const STAGING_SSO_CALLBACK_URL = "chinasupply.staging://sso-callback";

type AuthMode = "signIn" | "signUp";
type AuthStep = "email" | "emailCode" | "mfaCode";

const stayInCurrentApp = () => Promise.resolve();

void WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { fetchStatus: signInFetchStatus, signIn } = useSignIn();
  const { fetchStatus: signUpFetchStatus, signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [step, setStep] = useState<AuthStep>("email");
  const [emailAddress, setEmailAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [errorKey, setErrorKey] = useState<string>();
  const isSubmitting =
    signInFetchStatus === "fetching" ||
    signUpFetchStatus === "fetching" ||
    isGooglePending;

  const finalizeSignInOrRequestMfa = async () => {
    if (signIn.status === "complete") {
      const { error } = await signIn.finalize({ navigate: stayInCurrentApp });
      if (error) setErrorKey("auth.error.generic");
      return;
    }

    if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      const supportsEmailCode = signIn.supportedSecondFactors.some(
        (factor) => factor.strategy === "email_code",
      );
      if (!supportsEmailCode) {
        setErrorKey("auth.error.unsupported");
        return;
      }

      const { error } = await signIn.mfa.sendEmailCode();
      if (error) {
        setErrorKey("auth.error.generic");
        return;
      }
      setVerificationCode("");
      setStep("mfaCode");
      return;
    }

    setErrorKey("auth.error.unsupported");
  };

  const sendEmailCode = async () => {
    setErrorKey(undefined);
    const email = emailAddress.trim();

    try {
      if (mode === "signIn") {
        const createResult = await signIn.create({ identifier: email });
        if (createResult.error) throw createResult.error;
        const sendResult = await signIn.emailCode.sendCode();
        if (sendResult.error) throw sendResult.error;
      } else {
        const createResult = await signUp.create({
          emailAddress: email,
          locale: "en",
        });
        if (createResult.error) throw createResult.error;
        const sendResult = await signUp.verifications.sendEmailCode();
        if (sendResult.error) throw sendResult.error;
      }

      setVerificationCode("");
      setStep("emailCode");
    } catch {
      setErrorKey("auth.error.generic");
    }
  };

  const verifyEmailCode = async () => {
    setErrorKey(undefined);
    const code = verificationCode.trim();

    try {
      if (step === "mfaCode") {
        const { error } = await signIn.mfa.verifyEmailCode({ code });
        if (error) throw error;
        await finalizeSignInOrRequestMfa();
        return;
      }

      if (mode === "signIn") {
        const { error } = await signIn.emailCode.verifyCode({ code });
        if (error) throw error;
        await finalizeSignInOrRequestMfa();
      } else {
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        if (error) throw error;
        if (signUp.status !== "complete") {
          setErrorKey("auth.error.unsupported");
          return;
        }
        const finalResult = await signUp.finalize({
          navigate: stayInCurrentApp,
        });
        if (finalResult.error) throw finalResult.error;
      }
    } catch {
      setErrorKey("auth.error.generic");
    }
  };

  const continueWithGoogle = async () => {
    setErrorKey(undefined);
    setIsGooglePending(true);

    try {
      const result = await startSSOFlow({
        redirectUrl: STAGING_SSO_CALLBACK_URL,
        strategy: "oauth_google",
      });
      const browserResult = result.authSessionResult;

      if (
        !result.createdSessionId &&
        (browserResult?.type === "cancel" || browserResult?.type === "dismiss")
      ) {
        return;
      }

      if (!result.createdSessionId || !result.setActive) {
        setErrorKey("auth.error.google");
        return;
      }

      await result.setActive({ session: result.createdSessionId });
    } catch {
      setErrorKey("auth.error.google");
    } finally {
      setIsGooglePending(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setStep("email");
    setVerificationCode("");
    setErrorKey(undefined);
    void signIn.reset();
    void signUp.reset();
  };

  const changeEmail = () => {
    setStep("email");
    setVerificationCode("");
    setErrorKey(undefined);
    if (mode === "signIn") void signIn.reset();
    else void signUp.reset();
  };

  const isCodeStep = step !== "email";
  const submitDisabled = isCodeStep
    ? isSubmitting || verificationCode.trim().length === 0
    : isSubmitting || emailAddress.trim().length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{t("auth.eyebrow")}</Text>
            <Text style={styles.title}>
              {t(
                isCodeStep
                  ? step === "mfaCode"
                    ? "auth.mfa.title"
                    : "auth.code.title"
                  : mode === "signIn"
                    ? "auth.signIn.title"
                    : "auth.signUp.title",
              )}
            </Text>
            <Text style={styles.description}>
              {t(
                isCodeStep
                  ? step === "mfaCode"
                    ? "auth.mfa.description"
                    : "auth.code.description"
                  : mode === "signIn"
                    ? "auth.signIn.description"
                    : "auth.signUp.description",
              )}
            </Text>

            {isCodeStep ? (
              <>
                <Text style={styles.label}>{t("auth.code.label")}</Text>
                <TextInput
                  accessibilityLabel={t("auth.code.label")}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  onChangeText={setVerificationCode}
                  placeholder={t("auth.code.placeholder")}
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  testID="auth-code"
                  value={verificationCode}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>{t("auth.email.label")}</Text>
                <TextInput
                  accessibilityLabel={t("auth.email.label")}
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  onChangeText={setEmailAddress}
                  placeholder={t("auth.email.placeholder")}
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  testID="auth-email"
                  value={emailAddress}
                />
              </>
            )}

            <SubmitButton
              disabled={submitDisabled}
              isSubmitting={isSubmitting}
              label={t(isCodeStep ? "auth.code.submit" : `auth.${mode}.submit`)}
              onPress={() =>
                void (isCodeStep ? verifyEmailCode() : sendEmailCode())
              }
            />

            {isCodeStep ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={changeEmail}
                style={styles.linkButton}
                testID="auth-change-email"
              >
                <Text style={styles.linkText}>
                  {t("auth.code.changeEmail")}
                </Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.divider} />
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => void continueWithGoogle()}
                  style={styles.googleButton}
                  testID="auth-google"
                >
                  <Text style={styles.googleButtonText}>
                    {t("auth.google.continue")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() =>
                    changeMode(mode === "signIn" ? "signUp" : "signIn")
                  }
                  style={styles.linkButton}
                  testID="auth-switch-mode"
                >
                  <Text style={styles.linkText}>
                    {t(
                      mode === "signIn"
                        ? "auth.signUp.switch"
                        : "auth.signIn.switch",
                    )}
                  </Text>
                </Pressable>
              </>
            )}

            {errorKey ? (
              <Text accessibilityLiveRegion="assertive" style={styles.error}>
                {t(errorKey)}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SubmitButton({
  disabled,
  isSubmitting,
  label,
  onPress,
}: {
  disabled: boolean;
  isSubmitting: boolean;
  label: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
      testID="auth-submit"
    >
      {isSubmitting ? (
        <View style={styles.submitting}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.buttonText}>{t("auth.submitting")}</Text>
        </View>
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 22,
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonDisabled: { backgroundColor: "#94A3B8" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 440,
    padding: 24,
    width: "100%",
  },
  description: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  divider: { backgroundColor: "#E2E8F0", height: 1, marginVertical: 22 },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 20, marginTop: 16 },
  eyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  googleButton: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  googleButtonText: { color: "#0F172A", fontSize: 16, fontWeight: "700" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  keyboardView: { flex: 1 },
  label: { color: "#334155", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  linkButton: { alignItems: "center", marginTop: 18, padding: 8 },
  linkText: { color: "#0F766E", fontSize: 14, fontWeight: "700" },
  safeArea: { backgroundColor: "#F8FAFC", flex: 1 },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  submitting: { alignItems: "center", flexDirection: "row", gap: 10 },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
  },
});

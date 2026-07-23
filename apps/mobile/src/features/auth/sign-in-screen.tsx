import { useSignIn } from "@clerk/expo";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type SignInStep = "credentials" | "verification";

const stayInCurrentApp = () => Promise.resolve();

export default function SignInScreen() {
  const { fetchStatus, signIn } = useSignIn();
  const { t } = useTranslation();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<SignInStep>("credentials");
  const [errorKey, setErrorKey] = useState<string>();
  const isSubmitting = fetchStatus === "fetching";

  const finalizeOrRequestVerification = async () => {
    if (signIn.status === "complete") {
      const { error } = await signIn.finalize({ navigate: stayInCurrentApp });
      if (error) {
        setErrorKey("auth.error.generic");
      }
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

      setStep("verification");
      return;
    }

    setErrorKey("auth.error.unsupported");
  };

  const submitCredentials = async () => {
    setErrorKey(undefined);

    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setErrorKey("auth.error.generic");
        return;
      }

      await finalizeOrRequestVerification();
    } catch {
      setErrorKey("auth.error.generic");
    }
  };

  const submitVerification = async () => {
    setErrorKey(undefined);

    try {
      const { error } = await signIn.mfa.verifyEmailCode({
        code: verificationCode,
      });
      if (error) {
        setErrorKey("auth.error.generic");
        return;
      }

      await finalizeOrRequestVerification();
    } catch {
      setErrorKey("auth.error.generic");
    }
  };

  const credentialsDisabled =
    isSubmitting || emailAddress.trim().length === 0 || password.length === 0;
  const verificationDisabled =
    isSubmitting || verificationCode.trim().length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{t("auth.eyebrow")}</Text>
          <Text style={styles.title}>
            {t(step === "credentials" ? "auth.title" : "auth.code.title")}
          </Text>

          {step === "credentials" ? (
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
                testID="sign-in-email"
                value={emailAddress}
              />

              <Text style={styles.label}>{t("auth.password.label")}</Text>
              <TextInput
                accessibilityLabel={t("auth.password.label")}
                autoCapitalize="none"
                autoComplete="current-password"
                onChangeText={setPassword}
                placeholder={t("auth.password.placeholder")}
                placeholderTextColor="#94A3B8"
                secureTextEntry
                style={styles.input}
                testID="sign-in-password"
                value={password}
              />

              <SubmitButton
                disabled={credentialsDisabled}
                isSubmitting={isSubmitting}
                label={t("auth.submit")}
                onPress={() => void submitCredentials()}
              />
            </>
          ) : (
            <>
              <Text style={styles.description}>
                {t("auth.code.description")}
              </Text>
              <Text style={styles.label}>{t("auth.code.label")}</Text>
              <TextInput
                accessibilityLabel={t("auth.code.label")}
                autoComplete="one-time-code"
                inputMode="numeric"
                onChangeText={setVerificationCode}
                style={styles.input}
                testID="sign-in-code"
                value={verificationCode}
              />

              <SubmitButton
                disabled={verificationDisabled}
                isSubmitting={isSubmitting}
                label={t("auth.code.submit")}
                onPress={() => void submitVerification()}
              />
            </>
          )}

          {errorKey ? (
            <Text accessibilityLiveRegion="assertive" style={styles.error}>
              {t(errorKey)}
            </Text>
          ) : null}
        </View>
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
      testID="sign-in-submit"
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
    marginTop: 24,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    backgroundColor: "#94A3B8",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
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
    marginBottom: 6,
  },
  error: {
    color: "#B91C1C",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },
  eyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  keyboardView: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 16,
  },
  safeArea: {
    backgroundColor: "#F1F5F9",
    flex: 1,
  },
  submitting: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 6,
  },
});

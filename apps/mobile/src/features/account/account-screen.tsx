import { useUser } from "@clerk/expo";
import { deleteMe, updateMe } from "@chinasupply/api-client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useMobileProtectedApi } from "../../lib/mobile-protected-api";
import SignInScreen from "../auth/sign-in-screen";
import LegalLinks from "../legal/legal-links";

export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoaded: isUserLoaded, user } = useUser();
  const {
    getRequest,
    handleProtectedError,
    isLoaded,
    isSignedIn,
    signOutAndClear,
  } = useMobileProtectedApi();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [localeStatus, setLocaleStatus] = useState<"error" | "saved">();
  const [deleteError, setDeleteError] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => updateMe({ locale: "en" }, await getRequest()),
    onError: (error) => {
      void (async () => {
        if (await handleProtectedError(error)) {
          router.replace("/");
          return;
        }
        setLocaleStatus("error");
      })();
    },
    onSuccess: () => setLocaleStatus("saved"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteMe(await getRequest()),
    onError: (error) => {
      void (async () => {
        if (await handleProtectedError(error)) {
          router.replace("/");
          return;
        }
        setDeleteError(true);
      })();
    },
    onSuccess: async () => {
      await signOutAndClear();
      router.replace("/");
    },
  });

  const signOut = async () => {
    setIsSigningOut(true);
    await signOutAndClear();
    router.replace("/");
  };

  if (!isLoaded || !isUserLoaded) {
    return (
      <SafeAreaView style={styles.loading} testID="account-loading">
        <ActivityIndicator color="#0F766E" size="large" />
        <Text style={styles.loadingText}>{t("account.loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) return <SignInScreen />;

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    t("account.emailFallback");

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{t("account.eyebrow")}</Text>
        <Text style={styles.title}>{t("account.title")}</Text>
        <Text style={styles.description}>{t("account.description")}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("account.emailLabel")}</Text>
          <Text selectable style={styles.email} testID="account-email">
            {email}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("account.language.title")}</Text>
          <Text style={styles.cardDescription}>
            {t("account.language.description")}
          </Text>
          <Text style={styles.label}>{t("account.language.label")}</Text>
          <View
            accessibilityLabel={t("account.language.english")}
            accessibilityRole="radio"
            accessibilityState={{ selected: true }}
            style={styles.languageOption}
            testID="account-language-en"
          >
            <View style={styles.radioDot} />
            <Text style={styles.languageText}>
              {t("account.language.english")}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={updateMutation.isPending}
            onPress={() => {
              setLocaleStatus(undefined);
              updateMutation.mutate();
            }}
            style={[
              styles.primaryButton,
              updateMutation.isPending && styles.disabledButton,
            ]}
            testID="account-save-locale"
          >
            <Text style={styles.primaryButtonText}>
              {t(
                updateMutation.isPending
                  ? "account.language.saving"
                  : "account.language.save",
              )}
            </Text>
          </Pressable>
          {localeStatus ? (
            <Text
              accessibilityLiveRegion="polite"
              style={localeStatus === "error" ? styles.error : styles.success}
            >
              {t(
                localeStatus === "error"
                  ? "account.language.error"
                  : "account.language.saved",
              )}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => void signOut()}
            style={styles.secondaryButton}
            testID="account-sign-out"
          >
            <Text style={styles.secondaryButtonText}>
              {t(isSigningOut ? "account.signingOut" : "account.signOut")}
            </Text>
          </Pressable>
        </View>

        <LegalLinks variant="account" />

        <View style={styles.dangerCard}>
          <Text style={styles.cardTitle}>{t("account.delete.title")}</Text>
          <Text style={styles.cardDescription}>
            {t("account.delete.description")}
          </Text>
          {!confirmingDelete ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDeleteError(false);
                setConfirmingDelete(true);
              }}
              style={styles.dangerButton}
              testID="account-delete-start"
            >
              <Text style={styles.dangerButtonText}>
                {t("account.delete.action")}
              </Text>
            </Pressable>
          ) : (
            <View
              style={styles.confirmPanel}
              testID="account-delete-confirmation"
            >
              <Text style={styles.confirmText}>
                {t("account.delete.confirm")}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={deleteMutation.isPending}
                onPress={() => {
                  setDeleteError(false);
                  deleteMutation.mutate();
                }}
                style={styles.dangerButton}
                testID="account-delete-confirm"
              >
                <Text style={styles.dangerButtonText}>
                  {t(
                    deleteMutation.isPending
                      ? "account.delete.pending"
                      : "account.delete.action",
                  )}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={deleteMutation.isPending}
                onPress={() => setConfirmingDelete(false)}
                style={styles.secondaryButton}
                testID="account-delete-cancel"
              >
                <Text style={styles.secondaryButtonText}>
                  {t("account.delete.cancel")}
                </Text>
              </Pressable>
            </View>
          )}
          {deleteError ? (
            <Text accessibilityLiveRegion="assertive" style={styles.error}>
              {t("account.delete.error")}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  cardDescription: { color: "#475569", fontSize: 15, lineHeight: 22 },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  confirmPanel: { gap: 12, marginTop: 18 },
  confirmText: {
    color: "#7F1D1D",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  content: { padding: 20, paddingBottom: 40 },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#B91C1C",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  dangerButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  dangerCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  description: { color: "#475569", fontSize: 16, lineHeight: 23 },
  disabledButton: { backgroundColor: "#94A3B8" },
  email: { color: "#0F172A", fontSize: 16 },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 20, marginTop: 14 },
  eyebrow: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  label: { color: "#334155", fontSize: 14, fontWeight: "700", marginTop: 18 },
  languageOption: {
    alignItems: "center",
    borderColor: "#99F6E4",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  languageText: { color: "#0F172A", fontSize: 16, fontWeight: "700" },
  loading: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
  },
  loadingText: { color: "#475569", fontSize: 15, marginTop: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  radioDot: {
    backgroundColor: "#0F766E",
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  safeArea: { backgroundColor: "#F8FAFC", flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: "#0F172A", fontSize: 15, fontWeight: "700" },
  success: { color: "#047857", fontSize: 14, lineHeight: 20, marginTop: 14 },
  title: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8,
  },
});

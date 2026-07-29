import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { getMobileLegalUrls } from "../../config/legal-urls";
import { mobileEnvironment } from "../../env";

type LegalLinkKind = "privacy" | "terms";

export default function LegalLinks({
  variant,
}: Readonly<{ variant: "account" | "notice" }>) {
  const { t } = useTranslation();
  const urls = getMobileLegalUrls(mobileEnvironment.EXPO_PUBLIC_APP_ENV);
  const [failedLink, setFailedLink] = useState<LegalLinkKind>();

  const openLink = async (kind: LegalLinkKind) => {
    setFailedLink(undefined);

    try {
      await WebBrowser.openBrowserAsync(urls[kind]);
    } catch {
      setFailedLink(kind);
    }
  };

  const retry = () => {
    if (failedLink) void openLink(failedLink);
  };

  return (
    <View
      style={variant === "account" ? styles.accountCard : styles.notice}
      testID={`legal-links-${variant}`}
    >
      {variant === "account" ? (
        <>
          <Text style={styles.title}>{t("legal.title")}</Text>
          <Text style={styles.description}>{t("legal.description")}</Text>
          <View style={styles.accountLinks}>
            <LegalLink
              label={t("legal.privacy")}
              onPress={() => void openLink("privacy")}
              testID="legal-privacy-link"
            />
            <LegalLink
              label={t("legal.terms")}
              onPress={() => void openLink("terms")}
              testID="legal-terms-link"
            />
          </View>
        </>
      ) : (
        <Text style={styles.noticeText}>
          {t("legal.notice.prefix")}{" "}
          <Text
            accessibilityRole="link"
            onPress={() => void openLink("terms")}
            style={styles.inlineLink}
            testID="legal-terms-link"
          >
            {t("legal.terms")}
          </Text>{" "}
          {t("legal.notice.joiner")}{" "}
          <Text
            accessibilityRole="link"
            onPress={() => void openLink("privacy")}
            style={styles.inlineLink}
            testID="legal-privacy-link"
          >
            {t("legal.privacy")}
          </Text>
          {t("legal.notice.suffix")}
        </Text>
      )}

      {failedLink ? (
        <View style={styles.errorPanel}>
          <Text
            accessibilityLiveRegion="assertive"
            style={styles.error}
            testID="legal-open-error"
          >
            {t("legal.openError")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={styles.retryButton}
            testID="legal-open-retry"
          >
            <Text style={styles.retryText}>{t("legal.retry")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function LegalLink({
  label,
  onPress,
  testID,
}: Readonly<{ label: string; onPress: () => void; testID: string }>) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={styles.accountLink}
      testID={testID}
    >
      <Text style={styles.accountLinkText}>{label}</Text>
      <Text aria-hidden style={styles.arrow}>
        ↗
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  accountLink: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingVertical: 8,
  },
  accountLinkText: { color: "#0F766E", fontSize: 15, fontWeight: "800" },
  accountLinks: { marginTop: 10 },
  arrow: { color: "#0F766E", fontSize: 16 },
  description: { color: "#475569", fontSize: 15, lineHeight: 22 },
  error: { color: "#B91C1C", flex: 1, fontSize: 13, lineHeight: 19 },
  errorPanel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  inlineLink: { color: "#0F766E", fontWeight: "800" },
  notice: { marginTop: 18 },
  noticeText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  retryText: { color: "#0F766E", fontSize: 13, fontWeight: "800" },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
});

import { useAuth } from "@clerk/expo";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import SignInScreen from "./sign-in-screen";

const AUTH_RETURN_PATH_PATTERN =
  /^\/(?:clusters|factories)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeAuthReturnTo(
  value: string | string[] | undefined,
): "/saved" | `/clusters/${string}` | `/factories/${string}` {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "/saved" || AUTH_RETURN_PATH_PATTERN.test(candidate ?? ""))
    return candidate as
      "/saved" | `/clusters/${string}` | `/factories/${string}`;
  return "/saved";
}

export default function SignInRoute() {
  const { returnTo: routeReturnTo } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const returnTo = normalizeAuthReturnTo(routeReturnTo);

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace(returnTo as Href);
  }, [isLoaded, isSignedIn, returnTo, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <View style={styles.loading} testID="sign-in-route-loading">
        <ActivityIndicator color="#0F766E" size="large" />
        <Text style={styles.loadingText}>{t("auth.loading")}</Text>
      </View>
    );
  }

  return (
    <SignInScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace(returnTo as Href);
      }}
      onComplete={() => router.replace(returnTo as Href)}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "#475569", fontSize: 15, marginTop: 12 },
});

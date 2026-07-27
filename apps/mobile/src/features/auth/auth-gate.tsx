import { useAuth } from "@clerk/expo";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import AppMapScreen from "../map/app-map-screen";
import { workspaceCompatibility } from "../../lib/workspace-compatibility";
import SignInScreen from "./sign-in-screen";

export default function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { t } = useTranslation();

  if (!workspaceCompatibility.ready) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{t("workspace.unavailable")}</Text>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={styles.centered} testID="clerk-loading">
        <ActivityIndicator color="#0F766E" size="large" />
        <Text style={styles.loading}>{t("auth.loading")}</Text>
      </View>
    );
  }

  return isSignedIn ? <AppMapScreen /> : <SignInScreen />;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  error: {
    color: "#B91C1C",
    fontSize: 16,
    textAlign: "center",
  },
  loading: {
    color: "#334155",
    fontSize: 15,
    marginTop: 12,
  },
});

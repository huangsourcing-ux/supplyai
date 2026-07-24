import { useGetHealthLive } from "@chinasupply/api-client";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export type ApiHealthState = "error" | "loading" | "ready";

export function ApiHealthStatus() {
  const health = useGetHealthLive({
    query: {
      retry: false,
    },
  });
  const state: ApiHealthState = health.isPending
    ? "loading"
    : health.isError
      ? "error"
      : "ready";

  return <ApiHealthStatusView state={state} />;
}

export function ApiHealthStatusView({ state }: { state: ApiHealthState }) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={styles.container}
      testID="api-health-status"
    >
      <View
        style={[
          styles.dot,
          state === "ready" && styles.dotReady,
          state === "error" && styles.dotError,
        ]}
      />
      <Text style={styles.label}>{t(`apiHealth.${state}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 6,
  },
  dot: {
    backgroundColor: "#F59E0B",
    borderRadius: 4,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  dotError: {
    backgroundColor: "#DC2626",
  },
  dotReady: {
    backgroundColor: "#16A34A",
  },
  label: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
});

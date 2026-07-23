import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  captureMobileSentrySmokeException,
  mobileSentryEnvironment,
} from "../../lib/sentry";

export function MobileSentrySmoke() {
  const { t } = useTranslation();
  const [eventId, setEventId] = useState<string>();
  const [flushFailed, setFlushFailed] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function sendSmokeException() {
    setIsSending(true);
    setFlushFailed(false);

    const result = await captureMobileSentrySmokeException();
    setEventId(result.eventId);
    setFlushFailed(!result.flushed);
    setIsSending(false);
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={isSending}
        onPress={() => void sendSmokeException()}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>
          {isSending ? t("sentrySmoke.sending") : t("sentrySmoke.button")}
        </Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.result}>
        {flushFailed && eventId
          ? t("sentrySmoke.flushFailed", {
              environment: mobileSentryEnvironment,
              eventId,
            })
          : eventId
            ? t("sentrySmoke.sent", {
                environment: mobileSentryEnvironment,
                eventId,
              })
            : t("sentrySmoke.ready", {
                environment: mobileSentryEnvironment,
              })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0F766E",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  container: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  result: {
    color: "#475569",
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
});

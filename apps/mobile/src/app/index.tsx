import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function MobileShellScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand">
          {t("shell.eyebrow")}
        </Text>
        <Text className="text-center text-4xl font-bold text-ink">
          {t("shell.title")}
        </Text>
        <Text className="mt-4 text-center text-base text-slate-600">
          {t("shell.status")}
        </Text>
      </View>
    </SafeAreaView>
  );
}

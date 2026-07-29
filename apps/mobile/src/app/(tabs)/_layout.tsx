import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F766E",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: t("tabs.map"),
          tabBarLabel: t("tabs.map"),
          title: t("tabs.map"),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarAccessibilityLabel: t("tabs.explore"),
          tabBarLabel: t("tabs.explore"),
          title: t("tabs.explore"),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          tabBarAccessibilityLabel: t("tabs.saved"),
          tabBarLabel: t("tabs.saved"),
          title: t("tabs.saved"),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarAccessibilityLabel: t("tabs.account"),
          tabBarLabel: t("tabs.account"),
          title: t("tabs.account"),
        }}
      />
    </Tabs>
  );
}

import "react-native-gesture-handler";
import "../global.css";
import "../lib/i18n";
import "../lib/sentry";
import "../lib/workspace-compatibility";

import { ClerkProvider } from "@clerk/expo";
import { configureApiClient } from "@chinasupply/api-client";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useState } from "react";
import type { ViewProps } from "react-native";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { createQueryClient } from "../lib/query-client";
import { clerkTokenCache } from "../lib/clerk-token-cache";
import { mobileEnvironment } from "../env";
import { configureMapTilerRequests } from "../lib/maptiler-requests";

export { ErrorBoundary } from "expo-router";

void SplashScreen.preventAutoHideAsync();
configureMapTilerRequests();
configureApiClient({
  baseUrl: mobileEnvironment.EXPO_PUBLIC_API_BASE_URL,
});

function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const onLayout = useCallback<NonNullable<ViewProps["onLayout"]>>(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <ClerkProvider
        publishableKey={mobileEnvironment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
        tokenCache={clerkTokenCache}
      >
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

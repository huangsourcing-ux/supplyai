import { createFavorite } from "@chinasupply/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useMobileProtectedApi } from "../../lib/mobile-protected-api";
import {
  findFavoriteInCache,
  getFavoritesQueryKey,
  type FavoritesInfiniteData,
  upsertFavoriteInCache,
} from "./favorites-cache";

export function FavoriteSaveAction({
  returnTo,
  targetId,
  targetType,
}: Readonly<{
  returnTo: `/clusters/${string}` | `/factories/${string}`;
  targetId: string;
  targetType: "cluster" | "factory";
}>) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getRequest, handleProtectedError, isLoaded, isSignedIn, userId } =
    useMobileProtectedApi();
  const [savedAfterMutation, setSavedAfterMutation] = useState(false);
  const queryKey = getFavoritesQueryKey(userId ?? "signed-out");
  const cached = queryClient.getQueryData<FavoritesInfiniteData>(queryKey);
  const isSaved =
    savedAfterMutation ||
    findFavoriteInCache(cached, targetType, targetId) !== undefined;

  const mutation = useMutation({
    mutationFn: async () =>
      createFavorite({ targetId, targetType }, await getRequest()),
    onError: (error) => {
      void handleProtectedError(error);
    },
    onSuccess: async (response) => {
      setSavedAfterMutation(true);
      if (userId === null || userId === undefined) return;

      queryClient.setQueryData<FavoritesInfiniteData>(queryKey, (current) =>
        upsertFavoriteInCache(current, response.data),
      );
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const openSignIn = () => {
    router.push({
      pathname: "/sign-in",
      params: { returnTo },
    } as unknown as Href);
  };

  const label = !isLoaded
    ? t("favorites.save.action")
    : !isSignedIn
      ? t("favorites.save.action")
      : isSaved
        ? t("favorites.save.saved")
        : mutation.isError
          ? t("favorites.save.retry")
          : mutation.isPending
            ? t("favorites.save.saving")
            : t("favorites.save.action");
  const disabled = !isLoaded || mutation.isPending || isSaved;

  return (
    <View style={styles.action}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: isSaved }}
        disabled={disabled}
        onPress={() => {
          if (!isSignedIn) {
            openSignIn();
            return;
          }
          mutation.mutate();
        }}
        style={[styles.button, disabled && !isSaved && styles.buttonDisabled]}
        testID={`favorite-save-${targetType}`}
      >
        <Text aria-hidden style={styles.icon}>
          {isSaved ? "♥" : "♡"}
        </Text>
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
      <Text
        accessibilityLiveRegion={mutation.isError ? "assertive" : "polite"}
        style={[styles.status, mutation.isError && styles.statusError]}
      >
        {!isLoaded
          ? t("favorites.save.checking")
          : !isSignedIn
            ? t("favorites.save.signInHint")
            : mutation.isError
              ? t("favorites.save.error")
              : isSaved
                ? t("favorites.save.saved")
                : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "flex-start", marginTop: 18 },
  button: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 10,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  buttonDisabled: { backgroundColor: "#94A3B8" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  icon: { color: "#FFFFFF", fontSize: 20, marginRight: 7 },
  status: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
  },
  statusError: { color: "#B91C1C" },
});

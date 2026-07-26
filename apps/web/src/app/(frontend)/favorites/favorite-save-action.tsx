"use client";

import { SignInButton } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useId, useState } from "react";

import { createFavorite } from "@chinasupply/api-client";

import { useProtectedApi } from "@/auth/protected-api";

import styles from "./favorite-save-action.module.css";
import {
  getFavoritesQueryKey,
  type FavoritesInfiniteData,
  upsertFavoriteInCache,
} from "./favorites-cache";

export interface FavoriteSaveActionLabels {
  checking: string;
  error: string;
  retry: string;
  save: string;
  saved: string;
  saving: string;
  signInHint: string;
}

interface SaveButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  label: string;
  statusId: string;
}

const SaveButton = React.forwardRef<HTMLButtonElement, SaveButtonProps>(
  function SaveButton({ label, statusId, ...buttonProps }, reference) {
    return (
      <button
        aria-describedby={statusId}
        className={styles.button}
        ref={reference}
        type="button"
        {...buttonProps}
      >
        <span aria-hidden="true">
          {buttonProps["aria-pressed"] === true ? "♥" : "♡"}
        </span>
        {label}
      </button>
    );
  },
);

export function FavoriteSaveAction({
  labels,
  returnPath,
  targetId,
  targetType,
}: Readonly<{
  labels: FavoriteSaveActionLabels;
  returnPath: string;
  targetId: string;
  targetType: "cluster" | "factory";
}>) {
  const { getRequest, handleProtectedError, isLoaded, isSignedIn, userId } =
    useProtectedApi();
  const queryClient = useQueryClient();
  const statusId = useId();
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: async () =>
      createFavorite({ targetId, targetType }, await getRequest()),
    onError: (error) => {
      void handleProtectedError(error);
    },
    onSuccess: async (response) => {
      setSaved(true);
      if (userId !== null && userId !== undefined) {
        const queryKey = getFavoritesQueryKey(userId);
        queryClient.setQueryData<FavoritesInfiniteData>(queryKey, (cached) =>
          upsertFavoriteInCache(cached, response.data),
        );
        await queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  if (!isLoaded) {
    return (
      <div className={styles.action}>
        <SaveButton disabled label={labels.save} statusId={statusId} />
        <p aria-live="polite" className={styles.status} id={statusId}>
          {labels.checking}
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className={styles.action}>
        <SignInButton
          forceRedirectUrl={returnPath}
          mode="redirect"
          signUpForceRedirectUrl={returnPath}
          withSignUp
        >
          <SaveButton label={labels.save} statusId={statusId} />
        </SignInButton>
        <p aria-live="polite" className={styles.status} id={statusId}>
          {labels.signInHint}
        </p>
      </div>
    );
  }

  const isSaved = saved || mutation.isSuccess;
  const buttonLabel = isSaved
    ? labels.saved
    : mutation.isError
      ? labels.retry
      : labels.save;

  return (
    <div className={styles.action}>
      <SaveButton
        aria-pressed={isSaved}
        disabled={mutation.isPending || isSaved}
        label={buttonLabel}
        onClick={() => mutation.mutate()}
        statusId={statusId}
      />
      <p
        aria-live="polite"
        className={styles.status}
        data-error={String(mutation.isError)}
        id={statusId}
      >
        {mutation.isPending
          ? labels.saving
          : mutation.isError
            ? labels.error
            : isSaved
              ? labels.saved
              : ""}
      </p>
    </div>
  );
}

"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";

import { deleteMe, updateMe } from "@chinasupply/api-client";

import { PUBLIC_ACCOUNT_PATH } from "@/auth/public-auth-routes";
import { useProtectedApi } from "@/auth/protected-api";

import styles from "./account-page.module.css";

export interface AccountPageLabels {
  cancel: string;
  deleteAction: string;
  deleteConfirm: string;
  deleteDescription: string;
  deleteError: string;
  deletePending: string;
  deleteTitle: string;
  description: string;
  emailFallback: string;
  emailLabel: string;
  eyebrow: string;
  languageDescription: string;
  languageEnglish: string;
  languageLabel: string;
  languageSaved: string;
  languageSaveError: string;
  languageSaving: string;
  languageTitle: string;
  loading: string;
  signIn: string;
  signInDescription: string;
  signInTitle: string;
  signOut: string;
  signingOut: string;
  title: string;
}

export function AccountPageClient({
  labels,
}: Readonly<{ labels: AccountPageLabels }>) {
  const { isLoaded: isUserLoaded, user } = useUser();
  const {
    getRequest,
    handleProtectedError,
    isLoaded,
    isSignedIn,
    signOutAndClear,
  } = useProtectedApi();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const updateMutation = useMutation({
    mutationFn: async () => updateMe({ locale: "en" }, await getRequest()),
    onError: (error) => {
      void handleProtectedError(error);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => deleteMe(await getRequest()),
    onError: (error) => {
      void handleProtectedError(error);
    },
    onSuccess: async () => {
      await signOutAndClear();
    },
  });
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    labels.emailFallback;

  const signOut = async () => {
    setSigningOut(true);
    await signOutAndClear();
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>{labels.eyebrow}</p>
        <h1 className={styles.heading}>{labels.title}</h1>
        <p className={styles.description}>{labels.description}</p>

        {!isLoaded || !isUserLoaded ? (
          <section aria-live="polite" className={styles.card}>
            <p>{labels.loading}</p>
          </section>
        ) : !isSignedIn ? (
          <section className={styles.card}>
            <h2>{labels.signInTitle}</h2>
            <p>{labels.signInDescription}</p>
            <div className={styles.actions}>
              <SignInButton
                forceRedirectUrl={PUBLIC_ACCOUNT_PATH}
                mode="redirect"
                signUpForceRedirectUrl={PUBLIC_ACCOUNT_PATH}
                withSignUp
              >
                <button className={styles.primaryButton} type="button">
                  {labels.signIn}
                </button>
              </SignInButton>
            </div>
          </section>
        ) : (
          <div className={styles.stack}>
            <section className={styles.card}>
              <h2>{labels.emailLabel}</h2>
              <p className={styles.email}>{email}</p>
            </section>

            <section className={styles.card}>
              <h2>{labels.languageTitle}</h2>
              <p>{labels.languageDescription}</p>
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  updateMutation.mutate();
                }}
              >
                <label className={styles.label} htmlFor="account-language">
                  {labels.languageLabel}
                </label>
                <select
                  className={styles.select}
                  defaultValue="en"
                  id="account-language"
                >
                  <option value="en">{labels.languageEnglish}</option>
                </select>
                <div className={styles.actions}>
                  <button
                    className={styles.primaryButton}
                    disabled={updateMutation.isPending}
                    type="submit"
                  >
                    {updateMutation.isPending
                      ? labels.languageSaving
                      : labels.languageLabel}
                  </button>
                </div>
              </form>
              <p
                aria-live="polite"
                className={styles.status}
                data-error={String(updateMutation.isError)}
              >
                {updateMutation.isError
                  ? labels.languageSaveError
                  : updateMutation.isSuccess
                    ? labels.languageSaved
                    : ""}
              </p>
            </section>

            <section className={styles.card}>
              <button
                className={styles.secondaryButton}
                disabled={signingOut}
                onClick={() => void signOut()}
                type="button"
              >
                {signingOut ? labels.signingOut : labels.signOut}
              </button>
            </section>

            <section className={styles.dangerCard}>
              <h2>{labels.deleteTitle}</h2>
              <p>{labels.deleteDescription}</p>
              {!confirmingDelete ? (
                <div className={styles.actions}>
                  <button
                    className={styles.dangerButton}
                    onClick={() => setConfirmingDelete(true)}
                    type="button"
                  >
                    {labels.deleteAction}
                  </button>
                </div>
              ) : (
                <div className={styles.confirmPanel}>
                  <p>{labels.deleteConfirm}</p>
                  <div className={styles.confirmActions}>
                    <button
                      className={styles.dangerButton}
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate()}
                      type="button"
                    >
                      {deleteMutation.isPending
                        ? labels.deletePending
                        : labels.deleteAction}
                    </button>
                    <button
                      className={styles.secondaryButton}
                      disabled={deleteMutation.isPending}
                      onClick={() => setConfirmingDelete(false)}
                      type="button"
                    >
                      {labels.cancel}
                    </button>
                  </div>
                </div>
              )}
              <p
                aria-live="assertive"
                className={styles.status}
                data-error={String(deleteMutation.isError)}
              >
                {deleteMutation.isError ? labels.deleteError : ""}
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

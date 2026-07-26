"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import React from "react";

import { buildClusterAuthReturnPath } from "@/auth/public-auth-routes";

import styles from "./cluster-detail.module.css";

export interface ClusterSaveActionLabels {
  loading: string;
  pending: string;
  save: string;
  signInHint: string;
}

interface SaveButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  label: string;
}

const SaveButton = React.forwardRef<HTMLButtonElement, SaveButtonProps>(
  function SaveButton({ label, ...buttonProps }, reference) {
    return (
      <button
        aria-describedby="cluster-save-status"
        className={styles.saveButton}
        ref={reference}
        type="button"
        {...buttonProps}
      >
        <span aria-hidden="true">♡</span>
        {label}
      </button>
    );
  },
);

export function ClusterSaveAction({
  labels,
  slug,
}: Readonly<{
  labels: ClusterSaveActionLabels;
  slug: string;
}>) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className={styles.saveAction}>
        <SaveButton disabled label={labels.save} />
        <p
          aria-live="polite"
          className={styles.saveStatus}
          id="cluster-save-status"
        >
          {labels.loading}
        </p>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className={styles.saveAction}>
        <SaveButton disabled label={labels.save} />
        <p
          aria-live="polite"
          className={styles.saveStatus}
          id="cluster-save-status"
        >
          {labels.pending}
        </p>
      </div>
    );
  }

  const returnPath = buildClusterAuthReturnPath(slug);

  return (
    <div className={styles.saveAction}>
      <SignInButton
        forceRedirectUrl={returnPath}
        mode="redirect"
        signUpForceRedirectUrl={returnPath}
        withSignUp
      >
        <SaveButton label={labels.save} />
      </SignInButton>
      <p
        aria-live="polite"
        className={styles.saveStatus}
        id="cluster-save-status"
      >
        {labels.signInHint}
      </p>
    </div>
  );
}

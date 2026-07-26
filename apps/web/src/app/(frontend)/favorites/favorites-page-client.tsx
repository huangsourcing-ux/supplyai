"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  deleteFavorite,
  getFavorites,
  type GetFavorites200DataItem,
} from "@chinasupply/api-client";

import { PUBLIC_FAVORITES_PATH } from "@/auth/public-auth-routes";
import { useProtectedApi } from "@/auth/protected-api";

import {
  FAVORITES_PAGE_SIZE,
  flattenFavoritePages,
  getFavoritesQueryKey,
  getNextFavoritesCursor,
  removeFavoriteFromCache,
  type FavoritesInfiniteData,
} from "./favorites-cache";
import styles from "./favorites-page.module.css";

type FavoriteTab = "factory" | "cluster";

export interface FavoritesPageLabels {
  allLoaded: string;
  cluster: string;
  description: string;
  empty: string;
  error: string;
  eyebrow: string;
  factory: string;
  loadMore: string;
  loading: string;
  loadingMore: string;
  moreMayMatch: string;
  remove: string;
  removeError: string;
  removed: string;
  removing: string;
  retry: string;
  signIn: string;
  signInDescription: string;
  signInTitle: string;
  title: string;
  unavailable: string;
  unavailableDescription: string;
  unverified: string;
  verified: string;
  viewDetails: string;
}

function FavoriteCard({
  favorite,
  labels,
  mutationPending,
  onRemove,
  removing,
}: Readonly<{
  favorite: GetFavorites200DataItem;
  labels: FavoritesPageLabels;
  mutationPending: boolean;
  onRemove: () => void;
  removing: boolean;
}>) {
  if (favorite.target === null) {
    return (
      <li className={styles.unavailableCard}>
        <div>
          <p className={styles.type}>
            {favorite.targetType === "factory"
              ? labels.factory
              : labels.cluster}
          </p>
          <h2>{labels.unavailable}</h2>
          <p>{labels.unavailableDescription}</p>
        </div>
        <button
          aria-label={`${labels.remove} ${labels.unavailable}`}
          className={styles.removeButton}
          disabled={mutationPending}
          onClick={onRemove}
          type="button"
        >
          {removing ? labels.removing : labels.remove}
        </button>
      </li>
    );
  }

  const target = favorite.target;
  let imageUrl: string | null;
  let href: string;
  let verificationLabel = "";

  if ("imageUrl" in target) {
    imageUrl = target.imageUrl;
    href = `/factories/${target.slug}`;
    verificationLabel = ` · ${target.verified ? labels.verified : labels.unverified}`;
  } else {
    imageUrl = target.coverImageUrl;
    href = `/clusters/${target.slug}`;
  }

  return (
    <li className={styles.card}>
      <div className={styles.image}>
        {imageUrl === null ? (
          <div aria-hidden="true" className={styles.placeholder}>
            {target.name.charAt(0)}
          </div>
        ) : (
          <Image
            alt=""
            fill
            sizes="(max-width: 36rem) 7rem, (max-width: 54rem) 9rem, 9rem"
            src={imageUrl}
          />
        )}
      </div>
      <div className={styles.content}>
        <p className={styles.type}>
          {favorite.targetType === "factory" ? labels.factory : labels.cluster}
        </p>
        <h2>{target.name}</h2>
        <p className={styles.meta}>
          {target.region.name}
          {verificationLabel}
        </p>
        <p className={styles.products}>{target.mainProducts.join(" · ")}</p>
        <Link className={styles.cardLink} href={href}>
          {labels.viewDetails} <span aria-hidden="true">→</span>
        </Link>
        <button
          aria-label={`${labels.remove} ${target.name}`}
          className={styles.removeButton}
          disabled={mutationPending}
          onClick={onRemove}
          type="button"
        >
          {removing ? labels.removing : labels.remove}
        </button>
      </div>
    </li>
  );
}

export function FavoritesPageClient({
  labels,
}: Readonly<{ labels: FavoritesPageLabels }>) {
  const { getRequest, handleProtectedError, isLoaded, isSignedIn, userId } =
    useProtectedApi();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FavoriteTab>("factory");
  const queryKey = getFavoritesQueryKey(userId ?? "signed-out");
  const query = useInfiniteQuery({
    enabled: isLoaded && isSignedIn,
    getNextPageParam: getNextFavoritesCursor,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) =>
      getFavorites(
        {
          limit: FAVORITES_PAGE_SIZE,
          ...(pageParam === null ? {} : { cursor: pageParam }),
        },
        await getRequest(signal),
      ),
    queryKey,
  });
  const removeMutation = useMutation({
    mutationFn: async (favorite: GetFavorites200DataItem) =>
      deleteFavorite(
        favorite.targetType,
        favorite.targetId,
        await getRequest(),
      ),
    onError: (error, _favorite, context) => {
      const previous = context as FavoritesInfiniteData | undefined;
      if (previous !== undefined) {
        queryClient.setQueryData(queryKey, previous);
      }
      void handleProtectedError(error);
    },
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<FavoritesInfiniteData>(queryKey);
      queryClient.setQueryData<FavoritesInfiniteData>(queryKey, (cached) =>
        removeFavoriteFromCache(cached, favorite.id),
      );
      return previous;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (query.error !== null) void handleProtectedError(query.error);
  }, [handleProtectedError, query.error]);

  const favorites =
    query.data === undefined ? [] : flattenFavoritePages(query.data.pages);
  const visibleFavorites = favorites.filter(
    (favorite) => favorite.targetType === tab,
  );
  const panelId = `favorites-${tab}-panel`;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>{labels.eyebrow}</p>
        <h1 className={styles.heading}>{labels.title}</h1>
        <p className={styles.description}>{labels.description}</p>

        {!isLoaded ? (
          <section aria-live="polite" className={styles.stateCard}>
            <p>{labels.loading}</p>
          </section>
        ) : !isSignedIn ? (
          <section className={styles.stateCard}>
            <h2>{labels.signInTitle}</h2>
            <p>{labels.signInDescription}</p>
            <SignInButton
              forceRedirectUrl={PUBLIC_FAVORITES_PATH}
              mode="redirect"
              signUpForceRedirectUrl={PUBLIC_FAVORITES_PATH}
              withSignUp
            >
              <button className={styles.primaryButton} type="button">
                {labels.signIn}
              </button>
            </SignInButton>
          </section>
        ) : (
          <>
            <div
              aria-label={labels.title}
              className={styles.tabs}
              role="tablist"
            >
              {(["factory", "cluster"] as const).map((targetType) => (
                <button
                  aria-controls={`favorites-${targetType}-panel`}
                  aria-selected={tab === targetType}
                  className={styles.tab}
                  id={`favorites-${targetType}-tab`}
                  key={targetType}
                  onClick={() => setTab(targetType)}
                  role="tab"
                  type="button"
                >
                  {targetType === "factory" ? labels.factory : labels.cluster}
                </button>
              ))}
            </div>

            <section
              aria-labelledby={`favorites-${tab}-tab`}
              className={styles.panel}
              id={panelId}
              role="tabpanel"
            >
              {query.isPending ? (
                <div aria-live="polite" className={styles.stateCard}>
                  <p>{labels.loading}</p>
                </div>
              ) : query.isError ? (
                <div className={styles.stateCard} role="alert">
                  <h2>{labels.error}</h2>
                  <button
                    className={styles.primaryButton}
                    onClick={() => void query.refetch()}
                    type="button"
                  >
                    {labels.retry}
                  </button>
                </div>
              ) : visibleFavorites.length === 0 && !query.hasNextPage ? (
                <div className={styles.stateCard}>
                  <p>{labels.empty}</p>
                </div>
              ) : (
                <>
                  {visibleFavorites.length === 0 ? (
                    <div className={styles.stateCard}>
                      <p>{labels.moreMayMatch}</p>
                    </div>
                  ) : (
                    <ul className={styles.grid}>
                      {visibleFavorites.map((favorite) => (
                        <FavoriteCard
                          favorite={favorite}
                          key={favorite.id}
                          labels={labels}
                          mutationPending={removeMutation.isPending}
                          onRemove={() => removeMutation.mutate(favorite)}
                          removing={
                            removeMutation.isPending &&
                            removeMutation.variables?.id === favorite.id
                          }
                        />
                      ))}
                    </ul>
                  )}

                  <div aria-live="polite" className={styles.pagination}>
                    {query.hasNextPage ? (
                      <button
                        className={styles.secondaryButton}
                        disabled={query.isFetchingNextPage}
                        onClick={() => void query.fetchNextPage()}
                        type="button"
                      >
                        {query.isFetchingNextPage
                          ? labels.loadingMore
                          : labels.loadMore}
                      </button>
                    ) : (
                      <span>{labels.allLoaded}</span>
                    )}
                  </div>
                </>
              )}

              <p
                aria-live="polite"
                className={styles.mutationStatus}
                data-error={String(removeMutation.isError)}
              >
                {removeMutation.isError
                  ? labels.removeError
                  : removeMutation.isSuccess
                    ? labels.removed
                    : ""}
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

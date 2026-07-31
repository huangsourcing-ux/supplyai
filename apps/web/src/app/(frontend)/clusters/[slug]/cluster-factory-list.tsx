"use client";

import Image from "next/image";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import {
  getClusterFactories,
  type GetClusterFactories200,
  type GetClusterFactories200DataItem,
} from "@chinasupply/api-client";

import {
  CLUSTER_DETAIL_REVALIDATE_SECONDS,
  CLUSTER_FACTORY_PAGE_SIZE,
} from "./cluster-constants";
import { ListSkeleton } from "../../list-skeleton";
import styles from "./cluster-detail.module.css";

export function getNextFactoryCursor(
  page: GetClusterFactories200,
): string | undefined {
  return page.meta.nextCursor ?? undefined;
}

export function flattenFactoryPages(
  pages: readonly GetClusterFactories200[],
): GetClusterFactories200DataItem[] {
  const factories: GetClusterFactories200DataItem[] = [];
  const seenIds = new Set<string>();

  for (const page of pages) {
    for (const factory of page.data) {
      if (seenIds.has(factory.id)) continue;
      seenIds.add(factory.id);
      factories.push(factory);
    }
  }

  return factories;
}

export function ClusterFactoryCard({
  factory,
}: Readonly<{ factory: GetClusterFactories200DataItem }>) {
  const translate = useTranslations("ClusterDetail.factories");

  return (
    <li className={styles.factoryCard}>
      <Link
        aria-label={translate("viewFactory", { name: factory.name })}
        className={styles.factoryCardLink}
        href={`/factories/${factory.slug}`}
      >
        <div className={styles.factoryImage}>
          {factory.imageUrl === null ? (
            <div aria-hidden="true" className={styles.factoryImagePlaceholder}>
              <span>{factory.name.charAt(0)}</span>
            </div>
          ) : (
            <Image
              alt={translate("imageAlt", { name: factory.name })}
              fill
              sizes="(max-width: 42rem) calc(100vw - 3rem), (max-width: 70rem) 45vw, 22rem"
              src={factory.imageUrl}
            />
          )}
        </div>
        <div className={styles.factoryCardContent}>
          <div className={styles.factoryCardHeading}>
            <h3>{factory.name}</h3>
            <span
              className={styles.verificationBadge}
              data-verified={String(factory.verified)}
            >
              {translate(factory.verified ? "verified" : "unverified")}
            </span>
          </div>
          <p className={styles.factoryLocation}>{factory.region.name}</p>
          <ul
            aria-label={translate("mainProducts", { name: factory.name })}
            className={styles.factoryProducts}
          >
            {factory.mainProducts.map((product, index) => (
              <li key={`${product}-${index}`}>{product}</li>
            ))}
          </ul>
          <span className={styles.factoryCardAction}>
            {translate("viewDetails")}
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </li>
  );
}

export function ClusterFactoryList({
  initialPage,
  slug,
}: Readonly<{
  initialPage: GetClusterFactories200;
  slug: string;
}>) {
  const translate = useTranslations("ClusterDetail.factories");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    getNextPageParam: getNextFactoryCursor,
    initialData: {
      pageParams: [null],
      pages: [initialPage],
    },
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getClusterFactories(
        slug,
        {
          limit: CLUSTER_FACTORY_PAGE_SIZE,
          ...(pageParam === null ? {} : { cursor: pageParam }),
        },
        { signal },
      ),
    queryKey: ["cluster-factories", slug, CLUSTER_FACTORY_PAGE_SIZE],
    staleTime: CLUSTER_DETAIL_REVALIDATE_SECONDS * 1_000,
  });
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = query;
  const factories = flattenFactoryPages(data.pages);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      sentinel === null ||
      !hasNextPage ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting === true && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (factories.length === 0) {
    return <p className={styles.emptyState}>{translate("empty")}</p>;
  }

  return (
    <div>
      <ul className={styles.factoryGrid}>
        {factories.map((factory) => (
          <ClusterFactoryCard factory={factory} key={factory.id} />
        ))}
      </ul>
      {isFetchingNextPage ? (
        <div className={styles.nextPageSkeleton}>
          <ListSkeleton items={2} label={translate("loadingMore")} />
        </div>
      ) : null}

      <div aria-live="polite" className={styles.pagination}>
        {isFetchNextPageError ? (
          <div className={styles.paginationError} role="alert">
            <span>{translate("loadError")}</span>
            <button onClick={() => void fetchNextPage()} type="button">
              {translate("retry")}
            </button>
          </div>
        ) : hasNextPage ? (
          <button
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            type="button"
          >
            {translate(isFetchingNextPage ? "loadingMore" : "loadMore")}
          </button>
        ) : (
          <p>{translate("allLoaded")}</p>
        )}
      </div>
      <div aria-hidden="true" className={styles.sentinel} ref={sentinelRef} />
    </div>
  );
}

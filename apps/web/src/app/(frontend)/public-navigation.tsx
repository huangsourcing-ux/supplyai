"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import {
  PUBLIC_ACCOUNT_PATH,
  PUBLIC_FAVORITES_PATH,
} from "@/auth/public-auth-routes";

import styles from "./public-navigation.module.css";

export interface PublicNavigationLabels {
  account: string;
  brand: string;
  map: string;
  saved: string;
}

function isCurrentPath(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicNavigation({
  labels,
}: Readonly<{ labels: PublicNavigationLabels }>) {
  const pathname = usePathname();
  if (
    pathname === null ||
    pathname.startsWith("/ops") ||
    pathname.startsWith("/sign-in")
  ) {
    return null;
  }

  const links = [
    { href: "/", label: labels.map },
    { href: PUBLIC_FAVORITES_PATH, label: labels.saved },
    { href: PUBLIC_ACCOUNT_PATH, label: labels.account },
  ] as const;

  return (
    <nav aria-label={labels.brand} className={styles.navigation}>
      <Link className={styles.brand} href="/">
        {labels.brand}
      </Link>
      <div className={styles.links}>
        {links.map((link) => (
          <Link
            aria-current={
              isCurrentPath(pathname, link.href) ? "page" : undefined
            }
            className={styles.link}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
